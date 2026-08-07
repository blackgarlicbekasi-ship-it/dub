import { prisma } from "@dub/prisma";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

const SUSPENSION_TIMEOUT_MS = 800;

const suspensionRedis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  signal: () => AbortSignal.timeout(SUSPENSION_TIMEOUT_MS),
});

const suspensionKey = (userId: string) => `user:suspended:${userId}`;

export const markUserSuspended = async (userId: string): Promise<boolean> => {
  try {
    await suspensionRedis.set(suspensionKey(userId), 1);
    return true;
  } catch (e) {
    console.error("[auth] could not write suspension marker", e);
    return false;
  }
};

export const clearUserSuspended = async (userId: string): Promise<boolean> => {
  try {
    await suspensionRedis.del(suspensionKey(userId));
    return true;
  } catch (e) {
    console.error("[auth] could not clear suspension marker", e);
    return false;
  }
};

export const isUserSuspended = async (userId: string): Promise<boolean> => {
  let marked: boolean;

  try {
    marked = (await suspensionRedis.get(suspensionKey(userId))) !== null;
  } catch (e) {
    console.error("[auth] suspension marker unreadable, allowing request", e);
    return false;
  }

  if (!marked) {
    return false;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lockedAt: true },
    });

    if (user?.lockedAt) {
      return true;
    }

    await clearUserSuspended(userId);
    return false;
  } catch (e) {
    console.error("[auth] suspension unconfirmed, allowing request", e);
    return false;
  }
};

export const signOutSuspendedUser = (req: NextRequest) => {
  const response = NextResponse.redirect(
    new URL("/login?error=account-suspended", req.url),
  );

  for (const name of SESSION_COOKIES) {
    response.cookies.delete(name);
  }

  return response;
};
