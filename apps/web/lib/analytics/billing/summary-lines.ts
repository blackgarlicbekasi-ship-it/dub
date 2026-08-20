export const EMPTY_POT = "-";

export const VERCEL_SUMMARY_NOTE = "HOSTING SHORTLINK INGAT.CC";

export const UPSTASH_SUMMARY_NOTE = "CACHE REDIS INGAT.CC";

export interface SummaryLine {
  label: string;
  value: string;
  note: string;
}

const money = (value: number | null): string =>
  value === null ? EMPTY_POT : value.toFixed(2);

export const buildSummaryLines = ({
  totalClicks,
  periode,
  vercelTotal,
  upstashTotal,
  vercelNote = VERCEL_SUMMARY_NOTE,
}: {
  totalClicks: number;
  periode: string;
  vercelTotal: number | null;
  upstashTotal: number | null;
  vercelNote?: string;
}): SummaryLine[] => {
  const lines: SummaryLine[] = [
    {
      label: "TOTAL CLICK",
      value: totalClicks.toLocaleString("en-US"),
      note: "",
    },
    { label: "PERIODE", value: periode, note: "" },
    { label: "VERCEL", value: money(vercelTotal), note: vercelNote },
    { label: "UPSTASH", value: money(upstashTotal), note: UPSTASH_SUMMARY_NOTE },
  ];

  if (vercelTotal !== null && upstashTotal !== null) {
    lines.push({
      label: "TOTAL",
      value: money(vercelTotal + upstashTotal),
      note: "",
    });
  }

  return lines;
};
