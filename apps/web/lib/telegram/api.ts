const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramChat {
  id: number | string;
  type?: string;
}

export interface TelegramFrom {
  id: number | string;
  is_bot?: boolean;
  username?: string;
}

export interface TelegramMessage {
  message_id?: number;
  text?: string;
  chat?: TelegramChat;
  from?: TelegramFrom;
}

export interface TelegramUpdate {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

const call = async (
  botToken: string,
  method: string,
  payload: Record<string, unknown>,
) => {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as { ok: boolean; result?: unknown };
};

export const sendMessage = async (
  botToken: string,
  chatId: string | number,
  text: string,
) => {
  try {
    await call(botToken, "sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (e) {
    console.error("[telegram] sendMessage failed", e);
  }
};

export const isChatAdmin = async (
  botToken: string,
  chatId: string | number,
  userId: string | number,
): Promise<boolean> => {
  try {
    const data = await call(botToken, "getChatMember", {
      chat_id: chatId,
      user_id: userId,
    });

    if (!data.ok) {
      return false;
    }

    const status = (data.result as { status?: string } | undefined)?.status;

    return status === "administrator" || status === "creator";
  } catch (e) {
    console.error("[telegram] getChatMember failed", e);
    return false;
  }
};
