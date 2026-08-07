import { redis } from "@/lib/upstash/redis";

export const CONVERSATION_TTL_SECONDS = 20;

const NOTICE_GRACE_SECONDS = 300;

export type ConversationStep = "old" | "new";

export interface ConversationState {
  step: ConversationStep;
  oldValue?: string;
  expiresAt: number;
}

export interface ConversationId {
  botId: string;
  chatId: string | number;
  fromId: string | number;
}

export type ConversationLookup =
  | { status: "none" }
  | { status: "expired" }
  | { status: "active"; state: ConversationState };

const buildKey = ({ botId, chatId, fromId }: ConversationId) =>
  `tg:ganti:${botId}:${chatId}:${fromId}`;

export const loadConversation = async (
  id: ConversationId,
): Promise<ConversationLookup> => {
  try {
    const state = await redis.get<ConversationState>(buildKey(id));

    if (!state) {
      return { status: "none" };
    }

    if (state.expiresAt <= Date.now()) {
      await redis.del(buildKey(id));
      return { status: "expired" };
    }

    return { status: "active", state };
  } catch (e) {
    console.error("[telegram] conversation load failed", e);
    return { status: "none" };
  }
};

export const saveConversation = async (
  id: ConversationId,
  state: Omit<ConversationState, "expiresAt">,
): Promise<void> => {
  try {
    await redis.set(
      buildKey(id),
      { ...state, expiresAt: Date.now() + CONVERSATION_TTL_SECONDS * 1000 },
      { ex: CONVERSATION_TTL_SECONDS + NOTICE_GRACE_SECONDS },
    );
  } catch (e) {
    console.error("[telegram] conversation save failed", e);
  }
};

export const clearConversation = async (id: ConversationId): Promise<void> => {
  try {
    await redis.del(buildKey(id));
  } catch (e) {
    console.error("[telegram] conversation clear failed", e);
  }
};
