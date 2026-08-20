import { groupRowsByOwner } from "../group";
import { fixedSummaryLines } from "../summary-lines";
import type { ResolvedReport, ResolvedRow } from "../report";

export const EMPTY_POT = "-";

export const COLUMNS = [
  "Toko",
  "URL",
  "Click",
  "Percent",
  "Vercel($)",
  "Upstash($)",
  "Total($)",
] as const;

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface RenderRow {
  kind: "subtotal" | "slug";
  cells: string[];
}

export const formatAmount = (value: number | null): string =>
  value === null ? EMPTY_POT : value.toFixed(2);

export const formatPercent = (share: number): string =>
  `${(share * 100).toFixed(2)}%`;

export const formatClicks = (clicks: number): string =>
  clicks.toLocaleString("en-US");

export const rowToCells = (row: ResolvedRow): string[] => [
  row.toko,
  row.shortLink,
  formatClicks(row.clicks),
  formatPercent(row.share),
  formatAmount(row.vercelAmount),
  formatAmount(row.upstashAmount),
  formatAmount(row.totalAmount),
];

export const reportToRenderRows = (report: ResolvedReport): RenderRow[] => {
  const groups = groupRowsByOwner(report.rows, report.summary.totalClicks);
  const rendered: RenderRow[] = [];

  for (const group of groups) {
    rendered.push({
      kind: "subtotal",
      cells: [
        group.toko,
        "",
        formatClicks(group.subtotal.clicks),
        formatPercent(group.subtotal.share),
        formatAmount(group.subtotal.vercelAmount),
        formatAmount(group.subtotal.upstashAmount),
        formatAmount(group.subtotal.totalAmount),
      ],
    });

    for (const row of group.rows) {
      rendered.push({
        kind: "slug",
        cells: [
          "",
          row.shortLink,
          formatClicks(row.clicks),
          formatPercent(row.share),
          formatAmount(row.vercelAmount),
          formatAmount(row.upstashAmount),
          formatAmount(row.totalAmount),
        ],
      });
    }
  }

  return rendered;
};

export const summaryLines = (report: ResolvedReport): [string, string][] => [
  ["TOTAL CLICK", formatClicks(report.summary.totalClicks)],
  ["PERIODE", report.summary.periode],
  ["TOTAL", formatAmount(report.summary.grandTotal)],
  ...fixedSummaryLines(report.summary.vercelLine),
];

const slugifyPeriode = (periode: string) =>
  periode
    .toLowerCase()
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9-]/g, "");

export const exportFilename = (report: ResolvedReport, ext: ExportFormat) =>
  `billing-report-${slugifyPeriode(report.summary.periode)}.${ext}`;

export const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};
