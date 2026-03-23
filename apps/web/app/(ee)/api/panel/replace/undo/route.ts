import { getSession } from "@/lib/auth";
import { linkCache } from "@/lib/api/links/cache";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { logId } = await req.json();
  if (!logId) {
    return NextResponse.json({ error: "logId required" }, { status: 400 });
  }

  const logs = await prisma.$queryRawUnsafe(
    `SELECT id, userId, oldDomain, newDomain, linksUpdated FROM ReplaceLog WHERE id = ? AND userId = ?`,
    logId, session.user.id,
  ) as { id: string; userId: string; oldDomain: string; newDomain: string; linksUpdated: number }[];

  if (!logs.length) {
    return NextResponse.json({ error: "Log entry not found" }, { status: 404 });
  }

  const log = logs[0];
  const od = log.newDomain;
  const nd = log.oldDomain;

  const ws = await prisma.projectUsers.findMany({
    where: { userId: session.user.id, role: "owner" },
    select: { projectId: true },
  });
  const projectIds = ws.map((w) => w.projectId);

  const whereClause: Record<string, unknown> = {
    url: { contains: od },
  };
  if (projectIds.length > 0) {
    whereClause.projectId = { in: projectIds };
  }

  const links = await prisma.link.findMany({
    where: whereClause,
    select: { id: true, domain: true, key: true, url: true },
    take: 500,
  });

  let updated = 0;
  const cacheKeys: { domain: string; key: string }[] = [];
  const regex = new RegExp(od.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");

  for (const link of links) {
    const newUrl = link.url.replace(regex, nd);
    if (newUrl !== link.url) {
      await prisma.link.update({ where: { id: link.id }, data: { url: newUrl } });
      cacheKeys.push({ domain: link.domain, key: link.key });
      updated++;
    }
  }

  if (cacheKeys.length > 0) {
    await linkCache.deleteMany(cacheKeys);
  }

  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let rid = "rpl_";
  for (let i = 0; i < 20; i++) rid += c.charAt(Math.floor(Math.random() * c.length));

  await prisma.$executeRawUnsafe(
    `INSERT INTO ReplaceLog (id, userId, oldDomain, newDomain, linksUpdated, isUndo, createdAt) VALUES (?, ?, ?, ?, ?, 1, NOW())`,
    rid, session.user.id, od, nd, updated,
  );

  return NextResponse.json({ updated });
};
