import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withAdmin(async () => {
  const domains = await prisma.domain.findMany({
    select: {
      slug: true,
      verified: true,
      primary: true,
      target: true,
      type: true,
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json({ domains });
});
