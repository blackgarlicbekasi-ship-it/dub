import { prisma } from "@dub/prisma";
import { withAdmin } from "@/lib/auth/admin";
import { NextResponse } from "next/server";

interface PlanConfigRow {
  id: string;
  plan: string;
  linksLimit: number;
  usageLimit: number;
  domainsLimit: number;
  tagsLimit: number;
  foldersLimit: number;
  usersLimit: number;
  aiLimit: number;
  apiRateLimit: number;
  analyticsRetention: number;
  updatedAt: Date;
}

export const GET = withAdmin(async () => {
  const plans = await prisma.$queryRawUnsafe<PlanConfigRow[]>(
    `SELECT * FROM PlanConfig ORDER BY FIELD(plan, 'free', 'pro', 'business', 'enterprise')`,
  );

  const counts = await prisma.$queryRawUnsafe<{ plan: string; count: bigint }[]>(
    `SELECT plan, COUNT(*) as count FROM Project GROUP BY plan`,
  );

  const countByPlan = new Map(
    counts.map(({ plan, count }) => [plan, Number(count)]),
  );

  return NextResponse.json({
    plans: plans.map((plan) => ({
      ...plan,
      workspaceCount: countByPlan.get(plan.plan) ?? 0,
    })),
  });
});

export const PATCH = withAdmin(async ({ req }) => {
  const body = await req.json();
  const {
    plan,
    linksLimit,
    usageLimit,
    domainsLimit,
    tagsLimit,
    foldersLimit,
    usersLimit,
    aiLimit,
    apiRateLimit,
    analyticsRetention,
  } = body;

  if (!plan) {
    return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
  }

  const validPlans = ["free", "pro", "business", "enterprise"];
  if (!validPlans.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan name" }, { status: 400 });
  }

  // Update PlanConfig
  await prisma.$queryRawUnsafe(
    `UPDATE PlanConfig SET linksLimit = ?, usageLimit = ?, domainsLimit = ?, tagsLimit = ?, foldersLimit = ?, usersLimit = ?, aiLimit = ?, apiRateLimit = ?, analyticsRetention = ?, updatedAt = NOW() WHERE plan = ?`,
    linksLimit,
    usageLimit,
    domainsLimit,
    tagsLimit,
    foldersLimit,
    usersLimit,
    aiLimit,
    apiRateLimit,
    analyticsRetention,
    plan,
  );

  // Update all workspaces with this plan
  const result = await prisma.$queryRawUnsafe<{ affectedRows: number }[]>(
    `UPDATE Project SET linksLimit = ?, usageLimit = ?, domainsLimit = ?, tagsLimit = ?, foldersLimit = ?, usersLimit = ?, aiLimit = ? WHERE plan = ?`,
    linksLimit,
    usageLimit,
    domainsLimit,
    tagsLimit,
    foldersLimit,
    usersLimit,
    aiLimit,
    plan,
  );

  // Count affected workspaces
  const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM Project WHERE plan = ?`,
    plan,
  );
  const workspacesAffected = Number(countResult[0]?.count ?? 0);

  return NextResponse.json({
    success: true,
    plan,
    workspacesAffected,
  });
});
