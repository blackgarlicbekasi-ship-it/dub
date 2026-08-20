import Papa from "papaparse";
import type { ResolvedReport } from "../report";
import { COLUMNS, reportToRenderRows, summaryLines } from "./shared";

export const buildCsv = (report: ResolvedReport): string => {
  const table = [
    [...COLUMNS],
    ...reportToRenderRows(report).map(({ cells }) => cells),
    [],
    ...summaryLines(report).map(([label, value]) => [label, value]),
  ];

  return Papa.unparse(table, { newline: "\r\n" });
};
