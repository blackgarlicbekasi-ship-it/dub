import { isChatAdmin, type TelegramMessage } from "./api";

export const NOT_ADMIN_MESSAGE =
  "perintah tidak dapat dilaksanakan karena bukan admin yang bertugas";

export type SenderAuthorization =
  | { allowed: true }
  | { allowed: false; notify: boolean };

const DROP: SenderAuthorization = { allowed: false, notify: false };
const REFUSE: SenderAuthorization = { allowed: false, notify: true };

export const getAllowedTelegramUserIds = (): string[] =>
  (process.env.TELEGRAM_ALLOWED_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

export const passesTelegramWhitelist = (userId: string | number): boolean => {
  const allowed = getAllowedTelegramUserIds();

  if (allowed.length === 0) {
    return true;
  }

  return allowed.includes(String(userId));
};

export const authorizeSender = async ({
  message,
  botToken,
  boundChatId,
}: {
  message: TelegramMessage;
  botToken: string;
  boundChatId: string;
}): Promise<SenderAuthorization> => {
  const chatId = message.chat?.id;
  const from = message.from;

  if (chatId === undefined || !from || from.is_bot) {
    return DROP;
  }

  if (String(chatId) !== String(boundChatId)) {
    return DROP;
  }

  if (!passesTelegramWhitelist(from.id)) {
    return REFUSE;
  }

  if (message.chat?.type === "private") {
    return String(from.id) === String(boundChatId) ? { allowed: true } : REFUSE;
  }

  const admin = await isChatAdmin(botToken, chatId, from.id);

  return admin ? { allowed: true } : REFUSE;
};
