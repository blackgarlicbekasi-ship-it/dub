import { type ReplaceScope } from "@/lib/api/links/perform-replace";
import { prisma } from "@dub/prisma";

export const getUserWorkspaceIds = async (
  userId: string,
): Promise<string[]> => {
  const memberships = await prisma.projectUsers.findMany({
    where: { userId },
    select: { projectId: true },
  });

  return memberships.map((m) => m.projectId);
};

export const getBotReplaceScope = async (
  userId: string,
): Promise<ReplaceScope | null> => {
  const workspaceIds = await getUserWorkspaceIds(userId);

  if (workspaceIds.length === 0) {
    return null;
  }

  return { allWorkspaces: false, workspaceIds };
};
