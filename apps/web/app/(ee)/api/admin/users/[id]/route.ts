import { withAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const PATCH = withAdmin(async ({ req, params }) => {
  const userId = params.id;
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "change_password") {
    const { password } = body;
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return NextResponse.json({ success: true, message: "Password updated" });
  }

  if (action === "change_plan") {
    const { plan } = body;
    const validPlans = ["free", "pro", "business", "enterprise"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const ownership = await prisma.projectUsers.findFirst({
      where: { userId, role: "owner" },
    });
    if (!ownership) {
      return NextResponse.json(
        { error: "User has no workspace" },
        { status: 404 },
      );
    }
    await prisma.project.update({
      where: { id: ownership.projectId },
      data: { plan },
    });
    return NextResponse.json({ success: true, message: `Plan changed to ${plan}` });
  }

  if (action === "suspend") {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedAt: new Date() },
    });
    return NextResponse.json({ success: true, message: "User suspended" });
  }

  if (action === "unsuspend") {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedAt: null, invalidLoginAttempts: 0 },
    });
    return NextResponse.json({ success: true, message: "User unsuspended" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
});

export const DELETE = withAdmin(async ({ params }) => {
  const userId = params.id;
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ownedWorkspaces = await prisma.projectUsers.findMany({
    where: { userId, role: "owner" },
    select: { projectId: true },
  });

  const projectIds = ownedWorkspaces.map((w) => w.projectId);

  if (projectIds.length > 0) {
    await prisma.link.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    await prisma.domain.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    await prisma.defaultDomains.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    await prisma.projectUsers.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    await prisma.project.deleteMany({
      where: { id: { in: projectIds } },
    });
  }

  await prisma.projectUsers.deleteMany({
    where: { userId },
  });

  await prisma.session.deleteMany({
    where: { userId },
  });

  await prisma.account.deleteMany({
    where: { userId },
  });

  await prisma.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({ success: true, message: "User deleted" });
});
