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

export const POST = withAdmin(async ({ req }) => {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

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

  const links = workspaceIds.length
    ? await prisma.link.findMany({
        where: { projectId: { in: workspaceIds } },
        select: { id: true, domain: true, key: true },
      })
    : [];

  await prisma.user.update({
    where: { id: user.id },
    data: { lockedAt: new Date() },
  });

  await prisma.session.deleteMany({ where: { userId: user.id } });

  if (links.length) {
    await prisma.link.updateMany({
      where: { id: { in: links.map((link) => link.id) } },
      data: { projectId: LEGAL_WORKSPACE_ID },
    });

    for (const batch of chunk(links, BATCH_SIZE)) {
      await Promise.allSettled(
        batch.map((link) =>
          linkCache.delete({ domain: link.domain, key: link.key }),
        ),
      );
    }
  }

  return NextResponse.json({
    success: true,
    email: user.email,
    linksQuarantined: links.length,
    alreadyBanned: Boolean(user.lockedAt),
  });
});
