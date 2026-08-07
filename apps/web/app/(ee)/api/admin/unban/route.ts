import { clearBannedOrigin, readBannedOrigin } from "@/lib/api/links/banned-origin";
import { linkCache } from "@/lib/api/links/cache";
import { withAdmin } from "@/lib/auth";
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

const invalidate = async (links: { domain: string; key: string }[]) => {
  for (const batch of chunk(links, BATCH_SIZE)) {
    await Promise.allSettled(
      batch.map((link) =>
        linkCache.delete({ domain: link.domain, key: link.key }),
      ),
    );
  }
};

const restoreUser = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      lockedAt: true,
      projects: {
        where: { role: "owner" },
        select: { projectId: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const workspaceIds = user.projects.map(({ projectId }) => projectId);

  if (workspaceIds.length > 1) {
    return NextResponse.json(
      {
        error:
          "This user owns more than one workspace, so quarantined links cannot be attributed automatically. Restore the links individually by key.",
      },
      { status: 409 },
    );
  }

  const quarantined = workspaceIds.length
    ? await prisma.link.findMany({
        where: { projectId: LEGAL_WORKSPACE_ID, userId: user.id },
        select: { id: true, domain: true, key: true },
      })
    : [];

  await prisma.user.update({
    where: { id: user.id },
    data: { lockedAt: null, invalidLoginAttempts: 0 },
  });

  if (quarantined.length) {
    await prisma.link.updateMany({
      where: { id: { in: quarantined.map((link) => link.id) } },
      data: { projectId: workspaceIds[0] },
    });

    await clearBannedOrigin(quarantined.map((link) => link.id));
    await invalidate(quarantined);
  }

  return NextResponse.json({
    success: true,
    email: user.email,
    linksRestored: quarantined.length,
    wasBanned: Boolean(user.lockedAt),
  });
};

const restoreLink = async (domain: string, key: string, projectId?: string) => {
  const link = await prisma.link.findUnique({
    where: { domain_key: { domain, key } },
    select: { id: true, domain: true, key: true, userId: true, projectId: true },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (link.projectId !== LEGAL_WORKSPACE_ID) {
    return NextResponse.json(
      { error: "This link is not banned" },
      { status: 400 },
    );
  }

  const origin = await readBannedOrigin(link.id);

  let targetProjectId = projectId || origin?.originalProjectId;

  if (!targetProjectId && link.userId) {
    const owner = await prisma.projectUsers.findFirst({
      where: { userId: link.userId, role: "owner" },
      select: { projectId: true },
    });
    targetProjectId = owner?.projectId;
  }

  if (!targetProjectId) {
    return NextResponse.json(
      {
        error:
          "The original owner of this link cannot be determined. Supply a workspaceId to restore it into.",
      },
      { status: 409 },
    );
  }

  const target = await prisma.project.findUnique({
    where: { id: targetProjectId },
    select: {
      id: true,
      slug: true,
      users: {
        where: { role: "owner" },
        select: { userId: true },
        take: 1,
      },
    },
  });

  if (!target) {
    return NextResponse.json(
      { error: "Target workspace does not exist" },
      { status: 400 },
    );
  }

  const currentOwner = link.userId
    ? await prisma.user.findUnique({
        where: { id: link.userId },
        select: { id: true },
      })
    : null;

  const restoredUserId =
    currentOwner?.id ??
    origin?.originalUserId ??
    target.users[0]?.userId ??
    null;

  await prisma.link.update({
    where: { id: link.id },
    data: {
      projectId: target.id,
      userId: restoredUserId,
      archived: false,
    },
  });

  await clearBannedOrigin([link.id]);
  await invalidate([link]);

  return NextResponse.json({
    success: true,
    shortLink: `${link.domain}/${link.key}`,
    restoredTo: target.slug,
  });
};

export const POST = withAdmin(async ({ req }) => {
  const { email, domain, key, workspaceId } = await req.json();

  if (email) {
    return restoreUser(email);
  }

  if (domain && key) {
    return restoreLink(domain, key, workspaceId);
  }

  return NextResponse.json(
    { error: "Provide either an email, or a domain and key" },
    { status: 400 },
  );
});
