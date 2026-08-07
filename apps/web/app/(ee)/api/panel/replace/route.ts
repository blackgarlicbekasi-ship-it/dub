import {
  computeNewUrl,
  findReplaceCandidates,
  performReplace,
  type MatchMode,
  type ReplaceScope,
} from "@/lib/api/links/perform-replace";
import { getSession } from "@/lib/auth";
import { isDubAdmin } from "@/lib/auth/admin";
import { hasTelegramAccess } from "@/lib/telegram/permissions";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

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
  const matchMode: MatchMode = rawMatchMode === "exact" ? "exact" : "contains";

  const od = (oldDomain || "").trim();
  const nd = (newDomain || "").trim();

  if (!od || od.length < 3) {
    return NextResponse.json(
      { error: "Old domain must be at least 3 characters" },
      { status: 400 },
    );
  }
  if (!nd || nd.length < 3) {
    return NextResponse.json(
      { error: "New domain must be at least 3 characters" },
      { status: 400 },
    );
  }
  if (od === nd) {
    return NextResponse.json(
      { error: "Old and new domain cannot be the same" },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  const admin = await isDubAdmin(userId);
  const effectiveMode = admin ? mode || "my" : "my";

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

  const scope: ReplaceScope = {
    allWorkspaces: effectiveMode === "all",
    workspaceIds: projectIds,
  };

  if (effectiveMode !== "all" && projectIds.length === 0) {
    return NextResponse.json({ links: [], total: 0 });
  }

  if (preview) {
    const candidates = await findReplaceCandidates({
      oldValue: od,
      matchMode,
      scope,
    });

    return NextResponse.json({
      links: candidates.map((link) => ({
        id: link.id,
        shortLink: link.shortLink || `https://${link.domain}/${link.key}`,
        currentUrl: link.url,
        newUrl: computeNewUrl({
          url: link.url,
          oldValue: od,
          newValue: nd,
          matchMode,
        }),
      })),
      total: candidates.length,
    });
  }

  const { updated, failed, cacheFailed } = await performReplace({
    oldValue: od,
    newValue: nd,
    matchMode,
    scope,
  });

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ReplaceLog (id, userId, oldDomain, newDomain, linksUpdated, isUndo, createdAt) VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      genId("rpl_"),
      userId,
      od,
      nd,
      updated,
    );
  } catch (e) {
    console.error("[panel/replace] ReplaceLog insert failed", e);
  }

  if (updated > 0) {
    sendTelegramNotifications(userId, od, nd, updated).catch(() => {});
  }

  return NextResponse.json({ updated, failed, cacheFailed });
};

async function sendTelegramNotifications(
  userId: string,
  oldDomain: string,
  newDomain: string,
  linksUpdated: number,
) {
  const hasAccess = await hasTelegramAccess(userId);
  if (!hasAccess) return;

  // Get active bots
  const bots = (await prisma.$queryRawUnsafe(
    `SELECT botToken, chatId FROM TelegramBot WHERE userId = ? AND isActive = 1`,
    userId,
  )) as { botToken: string; chatId: string }[];

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

function genId(prefix: string) {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let r = prefix;
  for (let i = 0; i < 20; i++)
    r += c.charAt(Math.floor(Math.random() * c.length));
  return r;
}
