import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  try {
    const bots = await prisma.$queryRawUnsafe(
      `SELECT botToken, chatId FROM TelegramBot WHERE id = ? AND userId = ?`,
      id,
      session.user.id,
    ) as { botToken: string; chatId: string }[];

    if (!bots.length) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const bot = bots[0];
    const message = "Ingat Panel test notification - your bot is configured correctly!";

    const tgRes = await fetch(
      `https://api.telegram.org/bot${bot.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: bot.chatId,
          text: message,
          parse_mode: "HTML",
        }),
      },
    );

    if (!tgRes.ok) {
      const err = await tgRes.json();
      return NextResponse.json(
        { error: err.description || "Telegram API error" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to send test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
