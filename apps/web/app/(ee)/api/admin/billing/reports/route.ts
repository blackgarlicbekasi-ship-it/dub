import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import {
  BILLING_TIMEZONE,
  formatPeriode,
} from "@/lib/analytics/billing/snapshot";
import {
  fetchClickSnapshot,
  TinybirdUnavailableError,
} from "@/lib/analytics/billing/snapshot";
import { resolveReport } from "@/lib/analytics/billing/report";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

const parseAmount = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Bill totals must be a non negative number");
  }

  return parsed;
};

export const GET = withAdmin(async () => {
  const reports = await prisma.billingReport.findMany({
    select: {
      id: true,
      periode: true,
      start: true,
      end: true,
      intervalToken: true,
      vercelTotal: true,
      upstashTotal: true,
      totalClicks: true,
      snapshotAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      ...r,
      vercelTotal: r.vercelTotal === null ? null : Number(r.vercelTotal),
      upstashTotal: r.upstashTotal === null ? null : Number(r.upstashTotal),
    })),
  });
});

export const POST = withAdmin(async ({ req }) => {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let vercelTotal: number | null;
  let upstashTotal: number | null;

  try {
    vercelTotal = parseAmount(body.vercelTotal);
    upstashTotal = parseAmount(body.upstashTotal);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid amount" },
      { status: 400 },
    );
  }

  const { startDate, endDate } = getStartEndDates({
    interval: typeof body.interval === "string" ? body.interval : undefined,
    start: typeof body.start === "string" ? body.start : undefined,
    end: typeof body.end === "string" ? body.end : undefined,
    timezone: BILLING_TIMEZONE,
  });

  const existing = await prisma.billingReport.findFirst({
    where: { start: startDate, end: endDate },
    select: { id: true, periode: true, createdAt: true },
  });

  if (existing && body.force !== true) {
    return NextResponse.json(
      {
        error: "A report already exists for this interval",
        code: "interval_exists",
        existing,
      },
      { status: 409 },
    );
  }

  let snapshot;

  try {
    snapshot = await fetchClickSnapshot({ start: startDate, end: endDate });
  } catch (e) {
    if (e instanceof TinybirdUnavailableError) {
      console.error("[billing/reports] tinybird unavailable", e.detail);

      return NextResponse.json(
        { error: e.message, code: "analytics_unavailable" },
        { status: 503 },
      );
    }

    throw e;
  }

  const created = await prisma.billingReport.create({
    data: {
      intervalToken:
        typeof body.interval === "string" ? body.interval : null,
      start: startDate,
      end: endDate,
      periode: formatPeriode(startDate, endDate),
      vercelTotal,
      upstashTotal,
      snapshot: snapshot.rows,
      totalClicks: snapshot.totalClicks,
      snapshotAt: new Date(),
    },
  });

  return NextResponse.json(
    { report: await resolveReport(created) },
    { status: 201 },
  );
});
