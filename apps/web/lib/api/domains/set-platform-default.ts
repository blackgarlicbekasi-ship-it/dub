import { prisma } from "@dub/prisma";

export const setPlatformDefault = async (slug: string) => {
  return prisma.$transaction(async (tx) => {
    await tx.domain.updateMany({
      where: { platformDefault: true, slug: { not: slug } },
      data: { platformDefault: false },
    });

    return tx.domain.update({
      where: { slug },
      data: { platformDefault: true, platformWide: true },
      select: { slug: true, platformWide: true, platformDefault: true },
    });
  });
};
