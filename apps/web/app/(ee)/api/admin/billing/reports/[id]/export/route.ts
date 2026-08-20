import { resolveReport } from "@/lib/analytics/billing/report";
import {
  CONTENT_TYPES,
  exportFilename,
  type ExportFormat,
} from "@/lib/analytics/billing/export/shared";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FORMATS: ExportFormat[] = ["csv", "xlsx", "pdf"];

export const GET = withAdmin(async ({ params, searchParams }) => {
  const format = (searchParams.format ?? "csv") as ExportFormat;

  if (!FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `format must be one of ${FORMATS.join(", ")}` },
      { status: 400 },
    );
  }

  const stored = await prisma.billingReport.findUnique({
    where: { id: params.id },
  });

  if (!stored) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = await resolveReport(stored);
  const filename = exportFilename(report, format);

  let body: string | Buffer;

  if (format === "csv") {
    const { buildCsv } = await import("@/lib/analytics/billing/export/csv");
    body = buildCsv(report);
  } else if (format === "xlsx") {
    const { buildXlsx } = await import("@/lib/analytics/billing/export/xlsx");
    body = await buildXlsx(report);
  } else {
    const { buildPdf } = await import("@/lib/analytics/billing/export/pdf");
    body = await buildPdf(report);
  }

  return new NextResponse(body as any, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
