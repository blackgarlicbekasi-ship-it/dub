import type { ResolvedReport } from "../report";
import { COLUMNS, reportToRenderRows, summaryLines } from "./shared";

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

  for (const { kind, cells } of reportToRenderRows(report)) {
    const added = sheet.addRow(cells);

    for (let i = 3; i <= 7; i++) {
      added.getCell(i).alignment = { horizontal: "right" };
    }

    if (kind === "subtotal") {
      added.font = { bold: true };
      added.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FAFB" },
        };
      });
    } else {
      added.getCell(2).alignment = { horizontal: "left", indent: 2 };
      added.font = { color: { argb: "FF4B5563" } };
    }
  }

  sheet.addRow([]);

  for (const { label, value, note } of summaryLines(report)) {
    const added = sheet.addRow([label, value, note]);
    added.getCell(1).font = { bold: true };
    added.getCell(2).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
};
