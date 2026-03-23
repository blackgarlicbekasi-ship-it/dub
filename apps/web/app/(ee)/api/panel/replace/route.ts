import { getSession } from "@/lib/auth";
import { linkCache } from "@/lib/api/links/cache";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { oldDomain, newDomain, preview } = await req.json();

  if (!oldDomain || !newDomain) {
    return NextResponse.json(
      { error: "oldDomain and newDomain are required" },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  const ownedWorkspaces = await prisma.projectUsers.findMany({
    where: { userId, role: "owner" },
    select: { projectId: true },
  });

  const projectIds = ownedWorkspaces.map((w) => w.projectId);

  if (projectIds.length === 0) {
    return NextResponse.json({ links: [], total: 0 });
  }

  const matchingLinks = await prisma.link.findMany({
    where: {
      projectId: { in: projectIds },
      url: { contains: oldDomain },
    },
    select: {
      id: true,
      domain: true,
      key: true,
      shortLink: true,
      url: true,
    },
    take: 500,
  });

  const total = matchingLinks.length;

  if (preview) {
    return NextResponse.json({
      links: matchingLinks.map((link) => ({
        id: link.id,
        shortLink: link.shortLink || `https://${link.domain}/${link.key}`,
        currentUrl: link.url,
        newUrl: link.url.replace(new RegExp(escapeRegex(oldDomain), "g"), newDomain),
      })),
      total,
    });
  }

  let updated = 0;
  const cacheKeys: { domain: string; key: string }[] = [];

  for (const link of matchingLinks) {
    const newUrl = link.url.replace(
      new RegExp(escapeRegex(oldDomain), "g"),
      newDomain,
    );
    if (newUrl !== link.url) {
      await prisma.link.update({
        where: { id: link.id },
        data: { url: newUrl },
      });
      cacheKeys.push({ domain: link.domain, key: link.key });
      updated++;
    }
  }

  if (cacheKeys.length > 0) {
    await linkCache.deleteMany(cacheKeys);
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO ReplaceLog (id, userId, oldDomain, newDomain, linksUpdated, createdAt) VALUES (?, ?, ?, ?, ?, NOW())`,
    generateId(),
    userId,
    oldDomain,
    newDomain,
    updated,
  );

  return NextResponse.json({ updated });
};

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generateId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "rpl_";
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
