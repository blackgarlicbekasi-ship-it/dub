import { withAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withAdmin(async ({ req, searchParams }) => {
  const page = parseInt(searchParams.page || "1");
  const perPage = parseInt(searchParams.perPage || "20");
  const search = searchParams.search || "";

  const where = search
    ? {
        OR: [
          { email: { contains: search } },
          { name: { contains: search } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        lockedAt: true,
        invalidLoginAttempts: true,
        projects: {
          select: {
            role: true,
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                totalLinks: true,
                totalClicks: true,
              },
            },
          },
          where: { role: "owner" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ]);

  // Fetch telegram feature status for all users
  const userIds = users.map((u) => u.id);
  const telegramFeatures = userIds.length > 0
    ? await prisma.$queryRawUnsafe(
        `SELECT userId, enabled FROM UserFeature WHERE feature = 'telegram' AND userId IN (${userIds.map(() => "?").join(",")})`,
        ...userIds,
      ) as { userId: string; enabled: number }[]
    : [];
  const telegramMap = new Map(telegramFeatures.map((f) => [f.userId, f.enabled === 1]));

  const formatted = users.map((u) => {
    const workspace = u.projects[0]?.project || null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      createdAt: u.createdAt,
      lockedAt: u.lockedAt,
      invalidLoginAttempts: u.invalidLoginAttempts,
      telegramEnabled: telegramMap.get(u.id) || false,
      workspace: workspace
        ? {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            plan: workspace.plan,
            totalLinks: workspace.totalLinks,
            totalClicks: workspace.totalClicks,
          }
        : null,
    };
  });

  return NextResponse.json({
    users: formatted,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  });
});

export const POST = withAdmin(async ({ req }) => {
  const { email, password } = await req.json();

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
      source: "admin",
      notificationPreferences: {
        create: {},
      },
    },
  });

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    message: "User created. They will set up their workspace on first login.",
  });
});
