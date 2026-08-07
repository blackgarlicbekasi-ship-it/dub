import { prisma } from "@dub/prisma";

export interface BannedOrigin {
  linkId: string;
  originalUserId: string | null;
  originalProjectId: string;
}

export const recordBannedOrigin = async (
  links: { id: string; userId: string | null; projectId: string | null }[],
) => {
  const recordable = links.filter((link) => link.projectId);

  if (recordable.length === 0) {
    return;
  }

  try {
    for (const link of recordable) {
      await prisma.$executeRawUnsafe(
        "INSERT IGNORE INTO BannedLink (linkId, originalUserId, originalProjectId, bannedAt) VALUES (?, ?, ?, NOW(3))",
        link.id,
        link.userId,
        link.projectId,
      );
    }
  } catch (error) {
    console.error("[banned-origin] failed to record origin", error);
  }
};

export const readBannedOrigin = async (
  linkId: string,
): Promise<BannedOrigin | null> => {
  try {
    const rows = await prisma.$queryRawUnsafe<BannedOrigin[]>(
      "SELECT linkId, originalUserId, originalProjectId FROM BannedLink WHERE linkId = ?",
      linkId,
    );
    return rows[0] ?? null;
  } catch (error) {
    console.error("[banned-origin] failed to read origin", error);
    return null;
  }
};

export const clearBannedOrigin = async (linkIds: string[]) => {
  if (linkIds.length === 0) {
    return;
  }

  try {
    const placeholders = linkIds.map(() => "?").join(",");
    await prisma.$executeRawUnsafe(
      `DELETE FROM BannedLink WHERE linkId IN (${placeholders})`,
      ...linkIds,
    );
  } catch (error) {
    console.error("[banned-origin] failed to clear origin", error);
  }
};
