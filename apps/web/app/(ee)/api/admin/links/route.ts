import { transformLink } from "@/lib/api/links";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { LEGAL_WORKSPACE_ID } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withAdmin(async ({ searchParams }) => {
  const {
    domain,
    search,
    sort = "createdAt",
    page,
    banned,
  } = searchParams as {
    domain?: string;
    search?: string;
    sort?: "createdAt" | "clicks" | "lastClicked";
    page?: string;
    banned?: string;
  };

  const conditions: Prisma.LinkWhereInput[] = domain ? [{ domain }] : [];

  if (!search) {
    conditions.push({
      createdAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      },
    });
  }

  if (search) {
    conditions.push(
      search.startsWith("https://")
        ? { shortLink: search }
        : {
            OR: [
              { shortLink: { contains: search } },
              { url: { contains: search } },
            ],
          },
    );
  }

  if (banned === "only") {
    conditions.push({ projectId: LEGAL_WORKSPACE_ID });
  } else if (banned === "exclude") {
    conditions.push({
      NOT: { projectId: LEGAL_WORKSPACE_ID },
    });
  }

  const response = await prisma.link.findMany({
    where: { AND: conditions },
    include: {
      user: true,
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
    orderBy: {
      [sort]: "desc",
    },
    take: 100,
    ...(page && {
      skip: (parseInt(page) - 1) * 100,
    }),
  });

  const bannedLinks = response.filter(
    (link) => link.projectId === LEGAL_WORKSPACE_ID,
  );

  let origins: { linkId: string }[] = [];

  if (bannedLinks.length) {
    try {
      const placeholders = bannedLinks.map(() => "?").join(",");
      origins = await prisma.$queryRawUnsafe(
        `SELECT linkId FROM BannedLink WHERE linkId IN (${placeholders})`,
        ...bannedLinks.map((link) => link.id),
      );
    } catch (error) {
      console.error("[admin/links] origin lookup failed", error);
    }
  }

  const originIds = new Set(origins.map(({ linkId }) => linkId));

  const owners = await prisma.projectUsers.findMany({
    where: {
      userId: {
        in: bannedLinks
          .map((link) => link.userId)
          .filter((id): id is string => Boolean(id)),
      },
      role: "owner",
    },
    select: { userId: true },
  });

  const ownerIds = new Set(owners.map(({ userId }) => userId));

  return NextResponse.json(
    response.map((link) => {
      const banned = link.projectId === LEGAL_WORKSPACE_ID;

      return {
        ...transformLink(link),
        banned,
        archived: link.archived,
        originKnown: banned
          ? originIds.has(link.id) ||
            Boolean(link.userId && ownerIds.has(link.userId))
          : true,
      };
    }),
  );
});
