import {
  MAX_REPLACE_LINKS,
  findReplaceCandidates,
  performReplace,
} from "@/lib/api/links/perform-replace";
import { NOT_ADMIN_MESSAGE, authorizeSender } from "@/lib/telegram/access";
import { sendMessage, type TelegramUpdate } from "@/lib/telegram/api";
import {
  clearConversation,
  loadConversation,
  saveConversation,
  type ConversationId,
} from "@/lib/telegram/conversation";
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

const REPLACE_COMMANDS = new Set(["/ganti", "/replace"]);

const KNOWN_COMMANDS = new Set([
  "/start",
  "/help",
  "/preview",
  ...REPLACE_COMMANDS,
]);

const PROMPT_OLD = "Kirim URL lama yang ingin diganti.";
const PROMPT_NEW = "Kirim URL baru.";
const SESSION_EXPIRED = "Sesi telah berakhir. Mulai lagi dengan /ganti.";
const NO_MATCHING_LINKS =
  "Tidak ada link dengan URL tersebut. Proses dibatalkan.";
const COMMAND_FAILED = "That command failed. Nothing further was changed.";
const ANONYMOUS_SENDER =
  "Kirim perintah sebagai akun pribadi Anda, bukan sebagai grup. Ketuk foto pengirim di samping kolom pesan, pilih akun Anda, lalu ulangi perintahnya.";

const HELP = [
  "<b>Ingat bot</b>",
  "",
  "<code>/ganti</code> mulai penggantian URL langkah demi langkah",
  "<code>/preview &lt;old&gt; &lt;new&gt;</code> show what would change",
  "",
  `Matching is substring only, capped at ${MAX_REPLACE_LINKS} links.`,
].join("\n");

const parseCommand = (text: string) => {
  const parts = text.trim().split(/\s+/);
  const command = (parts[0] || "").split("@")[0].toLowerCase();

  return { command, args: parts.slice(1) };
};

const validatePair = (oldValue: string, newValue: string): string | null => {
  if (oldValue.length < 3 || newValue.length < 3) {
    return "Both values must be at least 3 characters.";
  }
  if (oldValue === newValue) {
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

  const chatId = message.chat?.id;
  const from = message.from;

  if (chatId === undefined) {
    console.error("[telegram/webhook] dropped, update has no chat", { botId });
    return ok();
  }

  const bots = (await prisma.$queryRawUnsafe(
    `SELECT id, userId, botToken, chatId FROM TelegramBot WHERE id = ? AND isActive = 1`,
    botId,
  )) as { id: string; userId: string; botToken: string; chatId: string }[];

  if (bots.length === 0) {
    console.error("[telegram/webhook] dropped, no active bot for this id", {
      botId,
    });
    return ok();
  }

  const bot = bots[0];

  if (String(chatId) !== String(bot.chatId)) {
    console.error("[telegram/webhook] dropped, chat is not the bound chat", {
      botId: bot.id,
      incomingChatId: String(chatId),
      boundChatId: String(bot.chatId),
    });
    return ok();
  }

  const { command, args } = parseCommand(text);
  const isCommand = KNOWN_COMMANDS.has(command);

  if (message.sender_chat && String(message.sender_chat.id) === String(chatId)) {
    console.error("[telegram/webhook] anonymous sender", {
      botId: bot.id,
      chatId: String(chatId),
      isCommand,
    });

    if (isCommand) {
      await sendMessage(bot.botToken, bot.chatId, ANONYMOUS_SENDER);
    }
    return ok();
  }

  if (!from || from.is_bot) {
    console.error("[telegram/webhook] dropped, sender is not a plain user", {
      botId: bot.id,
      hasFrom: !!from,
      isBot: from?.is_bot ?? null,
    });
    return ok();
  }

  const conversationId: ConversationId = {
    botId: bot.id,
    chatId,
    fromId: from.id,
  };

  const conversation = await loadConversation(conversationId);

  if (!isCommand && conversation.status === "none") {
    return ok();
  }

  const authorization = await authorizeSender({
    message,
    botToken: bot.botToken,
    boundChatId: bot.chatId,
  });

  if (!authorization.allowed) {
    console.error("[telegram/webhook] sender refused", {
      botId: bot.id,
      chatId: String(chatId),
      fromId: String(from.id),
      reason: authorization.reason,
    });

    if (authorization.reason !== "foreign_chat") {
      await sendMessage(bot.botToken, bot.chatId, NOT_ADMIN_MESSAGE);
    }
    return ok();
  }

  if (command === "/start" || command === "/help") {
    await sendMessage(bot.botToken, bot.chatId, HELP);
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

  if (REPLACE_COMMANDS.has(command)) {
    await saveConversation(conversationId, { step: "old" });
    await sendMessage(bot.botToken, bot.chatId, PROMPT_OLD);
    return ok();
  }

  if (!isCommand && conversation.status === "expired") {
    await sendMessage(bot.botToken, bot.chatId, SESSION_EXPIRED);
    return ok();
  }

  const scope = await getBotReplaceScope(bot.userId);

  if (!scope) {
    await clearConversation(conversationId);
    await sendMessage(
      bot.botToken,
      bot.chatId,
      "This account is not a member of any workspace, so there is nothing to replace.",
    );
    return ok();
  }

  if (
    !isCommand &&
    conversation.status === "active" &&
    conversation.state.step === "old"
  ) {
    const oldValue = text.trim();

    try {
      const candidates = await findReplaceCandidates({
        oldValue,
        matchMode: "contains",
        scope,
      });

      if (!candidates.some((link) => link.url.includes(oldValue))) {
        await clearConversation(conversationId);
        await sendMessage(bot.botToken, bot.chatId, NO_MATCHING_LINKS);
        return ok();
      }
    } catch (e) {
      console.error("[telegram/webhook] old value lookup failed", e);
      await clearConversation(conversationId);
      await sendMessage(bot.botToken, bot.chatId, COMMAND_FAILED);
      return ok();
    }

    await saveConversation(conversationId, { step: "new", oldValue });
    await sendMessage(bot.botToken, bot.chatId, PROMPT_NEW);
    return ok();
  }

  try {
    if (command === "/preview") {
      if (args.length !== 2) {
        await sendMessage(
          bot.botToken,
          bot.chatId,
          "Usage: /preview &lt;old&gt; &lt;new&gt;",
        );
        return ok();
      }

      const candidates = await findReplaceCandidates({
        oldValue: args[0],
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

    if (isCommand || conversation.status !== "active") {
      return ok();
    }

    const oldValue = conversation.state.oldValue ?? "";
    const newValue = text.trim();

    const invalid = validatePair(oldValue, newValue);

    if (invalid) {
      await clearConversation(conversationId);
      await sendMessage(bot.botToken, bot.chatId, invalid);
      return ok();
    }

    const { updated, failed, cacheFailed } = await performReplace({
      oldValue,
      newValue,
      matchMode: "contains",
      scope,
    });

    await clearConversation(conversationId);

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
    await clearConversation(conversationId);
    await sendMessage(bot.botToken, bot.chatId, COMMAND_FAILED);
  }

  return ok();
};
