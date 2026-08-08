import { prisma } from "@dub/prisma";

export interface PlatformDomain {
  slug: string;
  placeholder: string | null;
  platformDefault: boolean;
  verified: boolean;
  archived: boolean;
}

export const getPlatformDomains = async (): Promise<PlatformDomain[]> => {
  try {
    return await prisma.domain.findMany({
      where: { platformWide: true, archived: false },
      select: {
        slug: true,
        placeholder: true,
        platformDefault: true,
        verified: true,
        archived: true,
      },
      orderBy: [{ platformDefault: "desc" }, { slug: "asc" }],
    });
  } catch (e) {
    console.error("[domains] platform domain lookup failed", e);
    return [];
  }
};

export const getEnabledPlatformDomains = async (
  userId?: string | null,
): Promise<PlatformDomain[]> => {
  const platformDomains = await getPlatformDomains();

  if (platformDomains.length === 0) {
    return [];
  }

  const optional = platformDomains.filter((d) => !d.platformDefault);

  if (!userId || optional.length === 0) {
    return platformDomains.filter((d) => d.platformDefault);
  }

  let enabled = new Set<string>();

  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT domain FROM UserDomain WHERE userId = ? AND enabled = 1`,
      userId,
    )) as { domain: string }[];

    enabled = new Set(rows.map((r) => r.domain));
  } catch (e) {
    console.error("[domains] user domain preferences unreadable", e);
  }

  return platformDomains.filter(
    (d) => d.platformDefault || enabled.has(d.slug),
  );
};

export const isPlatformDomain = async (domain: string): Promise<boolean> => {
  const platformDomains = await getPlatformDomains();

  return platformDomains.some((d) => d.slug === domain);
};

export const isPlatformDomainEnabledForUser = async ({
  domain,
  userId,
}: {
  domain: string;
  userId?: string | null;
}): Promise<boolean> => {
  const enabled = await getEnabledPlatformDomains(userId);

  return enabled.some((d) => d.slug === domain);
};
