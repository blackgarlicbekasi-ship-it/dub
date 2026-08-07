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
  sender_chat?: TelegramChat;
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

  return (await res.json()) as {
    ok: boolean;
    result?: unknown;
    description?: string;
  };
};

export interface TelegramWebhookInfo {
  url: string;
  pendingUpdateCount: number;
  lastErrorMessage?: string;
}

export const setWebhook = async ({
  botToken,
  url,
  secretToken,
}: {
  botToken: string;
  url: string;
  secretToken: string;
}): Promise<{ ok: boolean; description?: string }> => {
  const data = await call(botToken, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });

  return { ok: data.ok, description: data.description };
};

export const deleteWebhook = async (
  botToken: string,
): Promise<{ ok: boolean; description?: string }> => {
  const data = await call(botToken, "deleteWebhook", {
    drop_pending_updates: true,
  });

  return { ok: data.ok, description: data.description };
};

export const getWebhookInfo = async (
  botToken: string,
): Promise<TelegramWebhookInfo | null> => {
  const data = await call(botToken, "getWebhookInfo", {});

  if (!data.ok) {
    return null;
  }

  const result = data.result as
    | {
        url?: string;
        pending_update_count?: number;
        last_error_message?: string;
      }
    | undefined;

  return {
    url: result?.url || "",
    pendingUpdateCount: result?.pending_update_count || 0,
    lastErrorMessage: result?.last_error_message,
  };
};

export const sendMessage = async (
  botToken: string,
  chatId: string | number,
  text: string,
): Promise<boolean> => {
  try {
    const data = await call(botToken, "sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });

    if (!data.ok) {
      console.error("[telegram] sendMessage rejected", data.description);
      return false;
    }

    return true;
  } catch (e) {
    console.error("[telegram] sendMessage failed", e);
    return false;
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
