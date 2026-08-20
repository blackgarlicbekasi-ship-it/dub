import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withAdmin(async () => {
  const [users, aliases] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
    prisma.billingAlias.findMany({
      select: { userId: true, alias: true, updatedAt: true },
    }),
  ]);

  const aliasByUser = new Map(aliases.map((a) => [a.userId, a]));

  return NextResponse.json({
    aliases: users.map((user) => ({
      userId: user.id,
      email: user.email,
      alias: aliasByUser.get(user.id)?.alias ?? null,
      updatedAt: aliasByUser.get(user.id)?.updatedAt ?? null,
    })),
  });
});

export const PUT = withAdmin(async ({ req }) => {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const alias = typeof body.alias === "string" ? body.alias.trim() : "";

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!alias) {
    await prisma.billingAlias.deleteMany({ where: { userId } });

    return NextResponse.json({ userId, alias: null });
  }

  if (alias.length > 100) {
    return NextResponse.json(
      { error: "Alias must be 100 characters or fewer" },
      { status: 400 },
    );
  }

  const saved = await prisma.billingAlias.upsert({
    where: { userId },
    create: { userId, alias },
    update: { alias },
    select: { userId: true, alias: true },
  });

  return NextResponse.json(saved);
});
