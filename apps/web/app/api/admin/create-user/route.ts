import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@dub/prisma";
import { SHORT_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/utils";
import { createId } from "@/lib/api/create-id";
import { createWorkspaceId } from "@/lib/api/workspaces/create-workspace-id";
import { nanoid } from "@dub/utils";

const ADMIN_USER_IDS = new Set([
  "user_1KMA04Z7J9TCYSHRRA2764Z1T",
]);

function generateRandomString(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST(req: Request) {
  const session = await getSession();

  if (!session?.user?.id || !ADMIN_USER_IDS.has(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email, password, plan } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const validPlans = ["free", "pro", "business", "enterprise"];
  if (!validPlans.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "User already exists with this email" },
      { status: 409 },
    );
  }

  const userId = createId({ prefix: "user_" });
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      id: userId,
      email,
      passwordHash,
      emailVerified: new Date(),
      notificationPreferences: {
        create: {},
      },
    },
  });

  const slug = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 20) || "user";

  let workspaceSlug = slug;
  const existingWorkspace = await prisma.project.findUnique({
    where: { slug: workspaceSlug },
  });
  if (existingWorkspace) {
    workspaceSlug = `${slug}-${generateRandomString(4)}`;
  }

  const workspaceId = createWorkspaceId();

  await prisma.project.create({
    data: {
      id: workspaceId,
      name: workspaceSlug,
      slug: workspaceSlug,
      plan,
      users: {
        create: {
          userId: user.id,
          role: "owner",
          notificationPreference: {
            create: {},
          },
        },
      },
      billingCycleStart: new Date().getDate(),
      invoicePrefix: generateRandomString(8),
      inviteCode: nanoid(24),
      defaultDomains: {
        create: {},
      },
    },
  });

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    workspaceSlug,
    plan,
  });
}
