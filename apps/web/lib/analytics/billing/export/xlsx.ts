import type { ResolvedReport } from "../report";
import { COLUMNS, rowToCells, summaryLines } from "./shared";

export const buildXlsx = async (report: ResolvedReport): Promise<Buffer> => {
  const ExcelJS = (await import("exceljs")).default;

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Billing Report");

  sheet.columns = [
    { width: 34 },
    { width: 30 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];

  const header = sheet.addRow([...COLUMNS]);
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD1D5DB" } } };
  });

  for (const row of report.rows) {
    const added = sheet.addRow(rowToCells(row));
    added.getCell(3).alignment = { horizontal: "right" };
    added.getCell(4).alignment = { horizontal: "right" };
    added.getCell(5).alignment = { horizontal: "right" };
    added.getCell(6).alignment = { horizontal: "right" };
    added.getCell(7).alignment = { horizontal: "right" };
  }

  sheet.addRow([]);

  for (const [label, value] of summaryLines(report)) {
    const added = sheet.addRow([label, value]);
    added.getCell(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
};
