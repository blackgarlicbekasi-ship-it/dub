export const getAdminUserIds = (): string[] =>
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

export const isAdminUserId = (userId?: string | null): boolean => {
  if (!userId) {
    return false;
  }

  const adminUserIds = getAdminUserIds();

  if (adminUserIds.length === 0) {
    return false;
  }

  return adminUserIds.includes(userId.trim());
};
