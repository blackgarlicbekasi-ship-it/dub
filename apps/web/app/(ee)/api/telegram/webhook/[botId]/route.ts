import {
  MAX_REPLACE_LINKS,
  findReplaceCandidates,
  performReplace,
} from "@/lib/api/links/perform-replace";
import { isAuthorizedSender } from "@/lib/telegram/access";
import { sendMessage, type TelegramUpdate } from "@/lib/telegram/api";
import { hasTelegramAccess } from "@/lib/telegram/permissions";
import { getBotReplaceScope } from "@/lib/telegram/scope";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ok = () => NextResponse.json({ ok: true });

const secretMatches = (received: string | null): boolean => {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expected || !received) {
    return false;
  }

  const a = Buffer.from(received);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
};

const HELP = [
  "<b>Ingat bot</b>",
  "",
  "<code>/preview &lt;old&gt; &lt;new&gt;</code> show what would change",
  "<code>/replace &lt;old&gt; &lt;new&gt;</code> apply the change",
  "",
  `Matching is substring only, capped at ${MAX_REPLACE_LINKS} links.`,
].join("\n");

const parseCommand = (text: string) => {
  const parts = text.trim().split(/\s+/);
  const command = (parts[0] || "").split("@")[0].toLowerCase();

  return { command, args: parts.slice(1) };
};

const validatePair = (args: string[]): string | null => {
  if (args.length !== 2) {
    return "Usage: /replace &lt;old&gt; &lt;new&gt;";
  }
  if (args[0].length < 3 || args[1].length < 3) {
    return "Both values must be at least 3 characters.";
  }
  if (args[0] === args[1]) {
    return "Old and new value cannot be the same.";
  }
  return null;
};

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) => {
  if (!secretMatches(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { botId } = await params;

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return ok();
  }

  const message = update.message ?? update.edited_message;
  const text = message?.text;

  if (!message || !text) {
    return ok();
  }

  const bots = (await prisma.$queryRawUnsafe(
    `SELECT id, userId, botToken, chatId FROM TelegramBot WHERE id = ? AND isActive = 1`,
    botId,
  )) as { id: string; userId: string; botToken: string; chatId: string }[];

  if (bots.length === 0) {
    return ok();
  }

  const bot = bots[0];

  const authorized = await isAuthorizedSender({
    message,
    botToken: bot.botToken,
    boundChatId: bot.chatId,
  });

  if (!authorized) {
    return ok();
  }

  const { command, args } = parseCommand(text);

  if (command === "/start" || command === "/help") {
    await sendMessage(bot.botToken, bot.chatId, HELP);
    return ok();
  }

  if (command !== "/preview" && command !== "/replace") {
    return ok();
  }

  if (!(await hasTelegramAccess(bot.userId))) {
    await sendMessage(
      bot.botToken,
      bot.chatId,
      "The Telegram feature is not enabled for this account.",
    );
    return ok();
  }

  const invalid = validatePair(args);
  if (invalid) {
    await sendMessage(bot.botToken, bot.chatId, invalid);
    return ok();
  }

  const scope = await getBotReplaceScope(bot.userId);
  if (!scope) {
    await sendMessage(
      bot.botToken,
      bot.chatId,
      "This account is not a member of any workspace, so there is nothing to replace.",
    );
    return ok();
  }

  const [oldValue, newValue] = args;

  try {
    if (command === "/preview") {
      const candidates = await findReplaceCandidates({
        oldValue,
        matchMode: "contains",
        scope,
      });

      const lines = candidates
        .slice(0, 10)
        .map((link) => `${link.domain}/${link.key} ${link.url}`);

      await sendMessage(
        bot.botToken,
        bot.chatId,
        [
          `Matches: ${candidates.length}`,
          ...lines,
          candidates.length > lines.length
            ? `and ${candidates.length - lines.length} more`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );

      return ok();
    }

    const { updated, failed, cacheFailed } = await performReplace({
      oldValue,
      newValue,
      matchMode: "contains",
      scope,
    });

    await sendMessage(
      bot.botToken,
      bot.chatId,
      [
        "Replace finished",
        `Updated: ${updated}`,
        `Failed: ${failed}`,
        `Cache refresh failed: ${cacheFailed}`,
      ].join("\n"),
    );
  } catch (e) {
    console.error("[telegram/webhook] command failed", e);
    await sendMessage(
      bot.botToken,
      bot.chatId,
      "That command failed. Nothing further was changed.",
    );
  }

  return ok();
};
