import { getSession } from "@/lib/auth";
import {
  deleteWebhook,
  getWebhookInfo,
  setWebhook,
} from "@/lib/telegram/api";
import { hasTelegramAccess } from "@/lib/telegram/permissions";
import { prisma } from "@dub/prisma";
import { SHORT_DOMAIN } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

const buildWebhookUrl = (botId: string) =>
  `https://${SHORT_DOMAIN}/api/telegram/webhook/${botId}`;

type OwnedBot = { id: string; botToken: string };

const resolveRequest = async (
  botId: string | null,
): Promise<
  { error: NextResponse } | { bot: OwnedBot }
> => {
  const session = await getSession();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!(await hasTelegramAccess(session.user.id))) {
    return {
      error: NextResponse.json(
        { error: "Telegram feature is disabled for your account" },
        { status: 403 },
      ),
    };
  }

  if (!botId) {
    return {
      error: NextResponse.json({ error: "Bot ID required" }, { status: 400 }),
    };
  }

  const bots = (await prisma.$queryRawUnsafe(
    `SELECT id, botToken FROM TelegramBot WHERE id = ? AND userId = ?`,
    botId,
    session.user.id,
  )) as OwnedBot[];

  if (bots.length === 0) {
    return {
      error: NextResponse.json({ error: "Bot not found" }, { status: 404 }),
    };
  }

  return { bot: bots[0] };
};

const requireSecret = (): string | null =>
  process.env.TELEGRAM_WEBHOOK_SECRET || null;

export const GET = async (req: NextRequest) => {
  const resolved = await resolveRequest(req.nextUrl.searchParams.get("id"));

  if ("error" in resolved) {
    return resolved.error;
  }

  const info = await getWebhookInfo(resolved.bot.botToken);

  if (!info) {
    return NextResponse.json(
      { error: "Could not read webhook status from Telegram" },
      { status: 502 },
    );
  }

  const expected = buildWebhookUrl(resolved.bot.id);

  return NextResponse.json({
    connected: info.url === expected,
    url: info.url,
    expectedUrl: expected,
    pendingUpdateCount: info.pendingUpdateCount,
    lastErrorMessage: info.lastErrorMessage,
  });
};

export const POST = async (req: NextRequest) => {
  const { id } = await req.json();
  const resolved = await resolveRequest(id ?? null);

  if ("error" in resolved) {
    return resolved.error;
  }

  const secret = requireSecret();

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret is not configured on the server" },
      { status: 500 },
    );
  }

  const result = await setWebhook({
    botToken: resolved.bot.botToken,
    url: buildWebhookUrl(resolved.bot.id),
    secretToken: secret,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.description || "Telegram rejected the webhook" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
};

export const DELETE = async (req: NextRequest) => {
  const { id } = await req.json();
  const resolved = await resolveRequest(id ?? null);

  if ("error" in resolved) {
    return resolved.error;
  }

  const result = await deleteWebhook(resolved.bot.botToken);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.description || "Telegram rejected the request" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
};
