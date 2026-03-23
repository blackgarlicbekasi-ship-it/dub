import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withAdmin(async () => {
  const [totalUsers, totalLinks, totalWorkspaces, clicksResult] =
    await Promise.all([
      prisma.user.count(),
      prisma.link.count(),
      prisma.project.count(),
      prisma.link.aggregate({ _sum: { clicks: true } }),
    ]);

  return NextResponse.json({
    totalUsers,
    totalLinks,
    totalClicks: clicksResult._sum.clicks || 0,
    totalWorkspaces,
  });
});
