import { clearBannedOrigin } from "@/lib/api/links/banned-origin";
import { linkCache } from "@/lib/api/links/cache";
import { withAdmin } from "@/lib/auth";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { LEGAL_WORKSPACE_ID } from "@dub/utils";
import { NextResponse } from "next/server";

const BATCH_SIZE = 10;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

export const GET = withAdmin(async () => {
  const links = await prisma.link.findMany({
    where: { projectId: LEGAL_WORKSPACE_ID, archived: false },
    select: {
      id: true,
      domain: true,
      key: true,
      shortLink: true,
      url: true,
      clicks: true,
      createdAt: true,
      userId: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  let origins: { linkId: string; originalProjectId: string }[] = [];

  if (links.length) {
    try {
      const placeholders = links.map(() => "?").join(",");
      origins = await prisma.$queryRawUnsafe(
        `SELECT linkId, originalProjectId FROM BannedLink WHERE linkId IN (${placeholders})`,
        ...links.map((link) => link.id),
      );
    } catch (error) {
      console.error("[admin/banned] origin lookup failed", error);
    }
  }

  const originByLink = new Map(
    origins.map(({ linkId, originalProjectId }) => [linkId, originalProjectId]),
  );

  const owners = await prisma.projectUsers.findMany({
    where: {
      userId: {
        in: links
          .map((link) => link.userId)
          .filter((id): id is string => Boolean(id)),
      },
      role: "owner",
    },
    select: { userId: true, projectId: true },
  });

  const workspaceByUser = new Map(
    owners.map(({ userId, projectId }) => [userId, projectId]),
  );

  return NextResponse.json({
    links: links.map((link) => ({
      ...link,
      originKnown: Boolean(
        originByLink.get(link.id) ||
          (link.userId && workspaceByUser.get(link.userId)),
      ),
    })),
  });
});

export const DELETE = withAdmin(async ({ req }) => {
  const { linkIds } = await req.json();

  if (!Array.isArray(linkIds) || linkIds.length === 0) {
    return NextResponse.json({ error: "linkIds required" }, { status: 400 });
  }

  const links = await prisma.link.findMany({
    where: { id: { in: linkIds }, projectId: LEGAL_WORKSPACE_ID },
    include: { webhooks: true },
  });

  if (links.length === 0) {
    return NextResponse.json(
      { error: "No banned links matched" },
      { status: 404 },
    );
  }

  await prisma.link.updateMany({
    where: { id: { in: links.map((link) => link.id) } },
    data: { archived: true },
  });

  await clearBannedOrigin(links.map((link) => link.id));

  for (const batch of chunk(links, BATCH_SIZE)) {
    await Promise.allSettled(
      batch.flatMap((link) => [
        linkCache.delete({ domain: link.domain, key: link.key }),
        recordLink(link as any, { deleted: true }),
      ]),
    );
  }

  return NextResponse.json({ success: true, removed: links.length });
});
