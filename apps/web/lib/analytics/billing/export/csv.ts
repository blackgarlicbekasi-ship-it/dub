import Papa from "papaparse";
import type { ResolvedReport } from "../report";
import { COLUMNS, rowToCells, summaryLines } from "./shared";

export const buildCsv = (report: ResolvedReport): string => {
  const table = [
    [...COLUMNS],
    ...report.rows.map((row) => rowToCells(row)),
    [],
    ...summaryLines(report).map(([label, value]) => [label, value]),
  ];

  return Papa.unparse(table, { newline: "\r\n" });
};
