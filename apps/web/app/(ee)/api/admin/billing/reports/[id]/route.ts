import { resolveReport } from "@/lib/analytics/billing/report";
import {
  BILLING_TIMEZONE,
  fetchClickSnapshot,
  formatPeriode,
  TinybirdUnavailableError,
} from "@/lib/analytics/billing/snapshot";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

const parseAmount = (value: unknown): number | null => {
  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Bill totals must be a non negative number");
  }

  return parsed;
};

export const GET = withAdmin(async ({ params }) => {
  const report = await prisma.billingReport.findUnique({
    where: { id: params.id },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ report: await resolveReport(report) });
});

export const PATCH = withAdmin(async ({ req, params }) => {
  const report = await prisma.billingReport.findUnique({
    where: { id: params.id },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  try {
    if ("vercelTotal" in body) {
      data.vercelTotal = parseAmount(body.vercelTotal);
    }

    if ("upstashTotal" in body) {
      data.upstashTotal = parseAmount(body.upstashTotal);
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid amount" },
      { status: 400 },
    );
  }

  const intervalChanged =
    "start" in body || "end" in body || "interval" in body;

  if (intervalChanged) {
    const { startDate, endDate } = getStartEndDates({
      interval: typeof body.interval === "string" ? body.interval : undefined,
      start: typeof body.start === "string" ? body.start : undefined,
      end: typeof body.end === "string" ? body.end : undefined,
      timezone: BILLING_TIMEZONE,
    });

    const sameInterval =
      startDate.getTime() === report.start.getTime() &&
      endDate.getTime() === report.end.getTime();

    if (!sameInterval) {
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

      data.start = startDate;
      data.end = endDate;
      data.periode = formatPeriode(startDate, endDate);
      data.intervalToken =
        typeof body.interval === "string" ? body.interval : null;
      data.snapshot = snapshot.rows;
      data.totalClicks = snapshot.totalClicks;
      data.snapshotAt = new Date();
    }
  }

  const updated = await prisma.billingReport.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ report: await resolveReport(updated) });
});

export const DELETE = withAdmin(async ({ params }) => {
  const report = await prisma.billingReport.findUnique({
    where: { id: params.id },
    select: { id: true, periode: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  await prisma.billingReport.delete({ where: { id: params.id } });

  return NextResponse.json({ deleted: report.id, periode: report.periode });
});
