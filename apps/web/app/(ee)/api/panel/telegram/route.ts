import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

async function checkTelegramAccess(userId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT enabled FROM UserFeature WHERE userId = ? AND feature = 'telegram'`,
      userId,
    ) as { enabled: number }[];
    if (rows.length === 0) return false;
    return rows[0].enabled === 1;
  } catch {
    return false;
  }
}

export const GET = async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await checkTelegramAccess(session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Telegram feature not enabled" }, { status: 403 });
  }

  try {
    const bots = await prisma.$queryRawUnsafe(
      `SELECT id, name, chatId, isActive FROM TelegramBot WHERE userId = ? ORDER BY createdAt DESC`,
      session.user.id,
    );
    return NextResponse.json({ bots });
  } catch {
    return NextResponse.json({ bots: [] });
  }
};

export const POST = async (req: NextRequest) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await checkTelegramAccess(session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Telegram feature not enabled" }, { status: 403 });
  }

  const { name, botToken, chatId } = await req.json();
  if (!name || !botToken || !chatId) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  try {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM TelegramBot WHERE userId = ?`,
      session.user.id,
    ) as { cnt: number }[];

    if (existing[0] && Number(existing[0].cnt) >= 5) {
      return NextResponse.json({ error: "Maximum 5 bots allowed" }, { status: 400 });
    }

    const id = "tg_" + Math.random().toString(36).substring(2, 22);
    await prisma.$executeRawUnsafe(
      `INSERT INTO TelegramBot (id, userId, botToken, chatId, name, isActive, createdAt) VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      id, session.user.id, botToken, chatId, name,
    );

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to add bot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const DELETE = async (req: NextRequest) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await checkTelegramAccess(session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Telegram feature not enabled" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Bot ID required" }, { status: 400 });
  }

  await prisma.$executeRawUnsafe(
    `DELETE FROM TelegramBot WHERE id = ? AND userId = ?`,
    id, session.user.id,
  );

  return NextResponse.json({ success: true });
};
