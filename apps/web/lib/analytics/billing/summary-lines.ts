export const UPSTASH_SUMMARY_LINE = "CACHE REDIS INGAT.CC";

export const fixedSummaryLines = (
  vercelLine: string,
): [string, string][] => [
  ["VERCEL", vercelLine],
  ["UPSTASH", UPSTASH_SUMMARY_LINE],
];
