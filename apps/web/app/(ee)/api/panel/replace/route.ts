import { getSession } from "@/lib/auth";
import { isDubAdmin } from "@/lib/auth/admin";
import { linkCache } from "@/lib/api/links/cache";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

// Max links touched by a single replace. Kept at the previous value so behaviour
// is unchanged; named so it is easy to lower if batches ever get heavy.
const MAX_LINKS = 500;

// How many links are updated / re-cached at once. Sequential would be up to 500
// serial round trips (minutes, against a 300s function ceiling); fully parallel
// would swamp the Prisma connection pool. 10 sits at or below the typical
// serverless pool size while still cutting wall-clock ~10x.
const BATCH_SIZE = 10;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

export const POST = async (req: NextRequest) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    oldDomain,
    newDomain,
    preview,
    mode,
    selectedUserIds,
    matchMode: rawMatchMode,
  } = await req.json();

  // Anything other than an explicit "exact" falls back to the previous
  // contains behaviour, so existing callers are unaffected.
  const matchMode: "exact" | "contains" =
    rawMatchMode === "exact" ? "exact" : "contains";

  const od = (oldDomain || "").trim();
  const nd = (newDomain || "").trim();

  if (!od || od.length < 3) {
    return NextResponse.json({ error: "Old domain must be at least 3 characters" }, { status: 400 });
  }
  if (!nd || nd.length < 3) {
    return NextResponse.json({ error: "New domain must be at least 3 characters" }, { status: 400 });
  }
  if (od === nd) {
    return NextResponse.json({ error: "Old and new domain cannot be the same" }, { status: 400 });
  }

  const userId = session.user.id;
  const admin = await isDubAdmin(userId);
  const effectiveMode = admin ? (mode || "my") : "my";

  let projectIds: string[] = [];

  if (effectiveMode === "my") {
    const ws = await prisma.projectUsers.findMany({
      where: { userId, role: "owner" },
      select: { projectId: true },
    });
    projectIds = ws.map((w) => w.projectId);
  } else if (effectiveMode === "selected" && Array.isArray(selectedUserIds)) {
    const ws = await prisma.projectUsers.findMany({
      where: { userId: { in: selectedUserIds }, role: "owner" },
      select: { projectId: true },
    });
    projectIds = ws.map((w) => w.projectId);
  }

  // exact  -> url must equal the search string
  // contains -> url contains the search string anywhere (previous behaviour)
  const whereClause: Record<string, unknown> = {
    url: matchMode === "exact" ? od : { contains: od },
  };
  if (effectiveMode !== "all") {
    if (projectIds.length === 0) {
      return NextResponse.json({ links: [], total: 0 });
    }
    whereClause.projectId = { in: projectIds };
  }

  const matchingLinks = await prisma.link.findMany({
    where: whereClause,
    // Only the fields formatRedisLink() consumes, plus domain/key for the cache
    // key and shortLink for the preview response. Deliberately does NOT select
    // title/description/image, which are the large columns.
    select: {
      id: true,
      domain: true,
      key: true,
      shortLink: true,
      url: true,
      trackConversion: true,
      password: true,
      proxy: true,
      rewrite: true,
      expiresAt: true,
      expiredUrl: true,
      disabledAt: true,
      ios: true,
      android: true,
      geo: true,
      doIndex: true,
      projectId: true,
      programId: true,
      partnerId: true,
      testVariants: true,
      testCompletedAt: true,
      webhooks: { select: { webhookId: true } },
    },
    take: MAX_LINKS,
  });

  // Defined once and used by BOTH the preview branch and the execute branch, so
  // the rows the user previews are exactly the rows that get written.
  //
  // In exact mode the row is replaced wholesale rather than via substring
  // substitution: MySQL's collation makes the `url = od` filter case
  // insensitive, so a matched row may differ in case from `od` and a
  // case-sensitive JS replace would leave it untouched.
  const computeNewUrl = (url: string) =>
    matchMode === "exact"
      ? nd
      : url.replace(new RegExp(escapeRegex(od), "g"), nd);

  const total = matchingLinks.length;

  if (preview) {
    return NextResponse.json({
      links: matchingLinks.map((link) => ({
        id: link.id,
        shortLink: link.shortLink || `https://${link.domain}/${link.key}`,
        currentUrl: link.url,
        newUrl: computeNewUrl(link.url),
      })),
      total,
    });
  }

  const pending = matchingLinks
    .map((link) => ({
      link,
      newUrl: computeNewUrl(link.url),
    }))
    .filter(({ link, newUrl }) => newUrl !== link.url);

  // Phase 1: persist. Each update is isolated, so one failing link neither
  // aborts the batch nor prevents cache invalidation for the ones that landed.
  const persisted: typeof matchingLinks = [];
  let failed = 0;

  for (const batch of chunk(pending, BATCH_SIZE)) {
    const results = await Promise.allSettled(
      batch.map(async ({ link, newUrl }) => {
        await prisma.link.update({
          where: { id: link.id },
          data: { url: newUrl },
        });
        return { ...link, url: newUrl };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        persisted.push(result.value);
      } else {
        failed++;
      }
    }
  }

  const updated = persisted.length;

  // Phase 2: invalidate, for the links that actually persisted.
  //
  // linkCache.set() is a write-through: it updates the LRU, writes Redis and
  // invalidates the Vercel Data Cache (cache.ts:53/56/59). deleteMany() only
  // issues a Redis del, which is why the Vercel copy survived a replace.
  //
  // Partner links take the delete path instead: their cache entry also carries
  // partner/discount data that only getPartnerEnrollmentInfo() can supply, so
  // writing through from this row alone would cache an entry missing that data
  // for the full 24h Redis TTL. Deleting forces the redirect path to rebuild it
  // completely (link.ts:99-118).
  //
  // Note the LRU here is this process's own; the instances serving redirects
  // have their own copies and can only be bounded by the 5s TTL.
  let cacheFailed = 0;

  for (const batch of chunk(persisted, BATCH_SIZE)) {
    const results = await Promise.allSettled(
      batch.map((link) =>
        link.programId && link.partnerId
          ? linkCache.delete({ domain: link.domain, key: link.key })
          : linkCache.set(link as any),
      ),
    );

    cacheFailed += results.filter((r) => r.status === "rejected").length;
  }

  // Non-fatal: the ReplaceLog table is not part of the Prisma schema and may not
  // exist. Losing the audit row must not fail a replace that already persisted.
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ReplaceLog (id, userId, oldDomain, newDomain, linksUpdated, isUndo, createdAt) VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      genId("rpl_"), userId, od, nd, updated,
    );
  } catch (e) {
    console.error("[panel/replace] ReplaceLog insert failed", e);
  }

  // Send telegram notifications (skip if user deactivated or telegram disabled)
  if (updated > 0) {
    sendTelegramNotifications(userId, od, nd, updated).catch(() => {});
  }

  return NextResponse.json({ updated, failed, cacheFailed });
};

async function sendTelegramNotifications(userId: string, oldDomain: string, newDomain: string, linksUpdated: number) {
  // Check if user is active
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedAt: true },
  });
  if (user?.lockedAt) return;

  // Check if telegram feature is enabled
  const featureRows = await prisma.$queryRawUnsafe(
    `SELECT enabled FROM UserFeature WHERE userId = ? AND feature = 'telegram'`,
    userId,
  ) as { enabled: number }[];
  if (featureRows.length > 0 && featureRows[0].enabled !== 1) return;

  // Get active bots
  const bots = await prisma.$queryRawUnsafe(
    `SELECT botToken, chatId FROM TelegramBot WHERE userId = ? AND isActive = 1`,
    userId,
  ) as { botToken: string; chatId: string }[];

  if (bots.length === 0) return;

  const message = [
    "Bulk URL Replace completed",
    "",
    `Old: ${oldDomain}`,
    `New: ${newDomain}`,
    `Links updated: ${linksUpdated}`,
  ].join("\n");

  for (const bot of bots) {
    try {
      await fetch(`https://api.telegram.org/bot${bot.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: bot.chatId,
          text: message,
          parse_mode: "HTML",
        }),
      });
    } catch {
      // Silently skip failed notifications
    }
  }
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function genId(prefix: string) {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let r = prefix;
  for (let i = 0; i < 20; i++) r += c.charAt(Math.floor(Math.random() * c.length));
  return r;
}
