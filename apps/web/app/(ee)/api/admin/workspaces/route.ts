import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { LEGAL_WORKSPACE_ID } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withAdmin(async () => {
  const workspaces = await prisma.project.findMany({
    where: { id: { not: LEGAL_WORKSPACE_ID } },
    select: { id: true, name: true, slug: true, plan: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  return NextResponse.json({ workspaces });
});
