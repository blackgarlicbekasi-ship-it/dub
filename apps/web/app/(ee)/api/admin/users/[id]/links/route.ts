import { linkCache } from "@/lib/api/links/cache";
import { withAdmin } from "@/lib/auth";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withAdmin(async ({ params, searchParams }) => {
  const userId = params.id;
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const page = parseInt(searchParams.page || "1");
  const perPage = parseInt(searchParams.perPage || "50");
  const search = searchParams.search || "";

  const ownedWorkspaces = await prisma.projectUsers.findMany({
    where: { userId, role: "owner" },
    select: { projectId: true },
  });

  const projectIds = ownedWorkspaces.map((w) => w.projectId);

  if (projectIds.length === 0) {
    return NextResponse.json({ links: [], total: 0, page, perPage, totalPages: 0 });
  }

  const where = {
    projectId: { in: projectIds },
    ...(search
      ? {
          OR: [
            { key: { contains: search } },
            { url: { contains: search } },
          ],
        }
      : {}),
  };

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      select: {
        id: true,
        domain: true,
        key: true,
        url: true,
        clicks: true,
        createdAt: true,
        archived: true,
        project: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.link.count({ where }),
  ]);

  return NextResponse.json({
    links: links.map((l) => ({
      id: l.id,
      domain: l.domain,
      key: l.key,
      shortLink: `https://${l.domain}/${l.key}`,
      url: l.url,
      clicks: l.clicks,
      createdAt: l.createdAt,
      archived: l.archived,
      workspaceSlug: l.project?.slug,
    })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  });
});

export const PATCH = withAdmin(async ({ req, params }) => {
  const userId = params.id;
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const { linkId, url } = await req.json();
  if (!linkId || !url) {
    return NextResponse.json({ error: "linkId and url required" }, { status: 400 });
  }

  const link = await prisma.link.findUnique({
    where: { id: linkId },
    select: { projectId: true },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const ownership = await prisma.projectUsers.findFirst({
    where: { userId, projectId: link.projectId!, role: "owner" },
  });

  if (!ownership) {
    return NextResponse.json({ error: "Link does not belong to this user" }, { status: 403 });
  }

  const updated = await prisma.link.update({
    where: { id: linkId },
    data: { url },
    include: { webhooks: true },
  });

  await Promise.allSettled([
    updated.programId && updated.partnerId
      ? linkCache.delete({ domain: updated.domain, key: updated.key })
      : linkCache.set(updated as any),
    recordLink(updated as any),
  ]);

  return NextResponse.json({ success: true, message: "Link URL updated" });
});

export const DELETE = withAdmin(async ({ req, params }) => {
  const userId = params.id;
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const { linkId } = await req.json();
  if (!linkId) {
    return NextResponse.json({ error: "linkId required" }, { status: 400 });
  }

  const link = await prisma.link.findUnique({
    where: { id: linkId },
    select: { projectId: true },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const ownership = await prisma.projectUsers.findFirst({
    where: { userId, projectId: link.projectId!, role: "owner" },
  });

  if (!ownership) {
    return NextResponse.json({ error: "Link does not belong to this user" }, { status: 403 });
  }

  const deleted = await prisma.link.delete({
    where: { id: linkId },
    include: { webhooks: true },
  });

  await Promise.allSettled([
    linkCache.delete({ domain: deleted.domain, key: deleted.key }),
    recordLink(deleted as any, { deleted: true }),
  ]);

  return NextResponse.json({ success: true, message: "Link deleted" });
});
