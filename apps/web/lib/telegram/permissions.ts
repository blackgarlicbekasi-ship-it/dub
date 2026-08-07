import { prisma } from "@dub/prisma";

export const TELEGRAM_FEATURE = "telegram";

export const hasTelegramAccess = async (
  userId: string,
): Promise<boolean> => {
  if (!userId) {
    return false;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lockedAt: true },
    });

    if (!user || user.lockedAt) {
      return false;
    }

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT enabled FROM UserFeature WHERE userId = ? AND feature = ?`,
      userId,
      TELEGRAM_FEATURE,
    )) as { enabled: number }[];

    if (rows.length === 0) {
      return false;
    }

    return Number(rows[0].enabled) === 1;
  } catch (e) {
    console.error("[telegram] permission lookup failed", e);
    return false;
  }
};
