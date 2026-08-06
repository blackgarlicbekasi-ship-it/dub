import { transformLink } from "@/lib/api/links";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { DUB_DOMAINS_ARRAY, LEGAL_WORKSPACE_ID } from "@dub/utils";
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

  const conditions: Prisma.LinkWhereInput[] = [
    domain ? { domain } : { domain: { in: DUB_DOMAINS_ARRAY } },
  ];

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

  return NextResponse.json(
    response.map((link) => ({
      ...transformLink(link),
      banned: link.projectId === LEGAL_WORKSPACE_ID,
    })),
  );
});
