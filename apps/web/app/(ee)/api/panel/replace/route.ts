import { getSession } from "@/lib/auth";
import { isDubAdmin } from "@/lib/auth/admin";
import { linkCache } from "@/lib/api/links/cache";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { oldDomain, newDomain, preview, mode, selectedUserIds } = await req.json();

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

  const whereClause: Record<string, unknown> = {
    url: { contains: od },
  };
  if (effectiveMode !== "all") {
    if (projectIds.length === 0) {
      return NextResponse.json({ links: [], total: 0 });
    }
    whereClause.projectId = { in: projectIds };
  }

  const matchingLinks = await prisma.link.findMany({
    where: whereClause,
    select: { id: true, domain: true, key: true, shortLink: true, url: true },
    take: 500,
  });

  const total = matchingLinks.length;

  if (preview) {
    return NextResponse.json({
      links: matchingLinks.map((link) => ({
        id: link.id,
        shortLink: link.shortLink || `https://${link.domain}/${link.key}`,
        currentUrl: link.url,
        newUrl: link.url.replace(new RegExp(escapeRegex(od), "g"), nd),
      })),
      total,
    });
  }

  let updated = 0;
  const cacheKeys: { domain: string; key: string }[] = [];

  for (const link of matchingLinks) {
    const newUrl = link.url.replace(new RegExp(escapeRegex(od), "g"), nd);
    if (newUrl !== link.url) {
      await prisma.link.update({ where: { id: link.id }, data: { url: newUrl } });
      cacheKeys.push({ domain: link.domain, key: link.key });
      updated++;
    }
  }

  if (cacheKeys.length > 0) {
    await linkCache.deleteMany(cacheKeys);
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO ReplaceLog (id, userId, oldDomain, newDomain, linksUpdated, isUndo, createdAt) VALUES (?, ?, ?, ?, ?, 0, NOW())`,
    genId("rpl_"), userId, od, nd, updated,
  );

  return NextResponse.json({ updated });
};

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function genId(prefix: string) {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let r = prefix;
  for (let i = 0; i < 20; i++) r += c.charAt(Math.floor(Math.random() * c.length));
  return r;
}
