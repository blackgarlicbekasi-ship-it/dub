import type { ResolvedReport } from "../report";
import { COLUMNS, rowToCells, summaryLines } from "./shared";

const COLUMN_WIDTHS = ["26%", "24%", "12%", "10%", "9%", "9%", "10%"];

export const buildPdf = async (report: ResolvedReport): Promise<Buffer> => {
  const React = (await import("react")).default;
  const { Document, Page, Text, View, StyleSheet, renderToBuffer } =
    await import("@react-pdf/renderer");

  const styles = StyleSheet.create({
    page: {
      paddingTop: 32,
      paddingBottom: 40,
      paddingHorizontal: 28,
      fontSize: 8,
      fontFamily: "Helvetica",
      color: "#111827",
    },
    title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    subtitle: { fontSize: 9, color: "#6B7280", marginBottom: 14 },
    headerRow: {
      flexDirection: "row",
      backgroundColor: "#F3F4F6",
      borderBottomWidth: 1,
      borderBottomColor: "#D1D5DB",
      paddingVertical: 5,
      paddingHorizontal: 4,
    },
    row: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: "#E5E7EB",
      paddingVertical: 3.5,
      paddingHorizontal: 4,
    },
    headerCell: { fontFamily: "Helvetica-Bold", fontSize: 8 },
    cell: { fontSize: 8 },
    right: { textAlign: "right" },
    summary: {
      marginTop: 18,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: "#D1D5DB",
    },
    summaryRow: { flexDirection: "row", marginBottom: 3 },
    summaryLabel: { width: 90, fontFamily: "Helvetica-Bold", fontSize: 9 },
    summaryValue: { fontSize: 9 },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 28,
      right: 28,
      fontSize: 7,
      color: "#9CA3AF",
      textAlign: "center",
    },
  });

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Billing Report"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        report.summary.periode,
      ),
      React.createElement(
        View,
        { style: styles.headerRow },
        ...COLUMNS.map((label, i) =>
          React.createElement(
            Text,
            {
              key: label,
              style: [
                styles.headerCell,
                { width: COLUMN_WIDTHS[i] },
                i >= 2 ? styles.right : {},
              ],
            },
            label,
          ),
        ),
      ),
      ...report.rows.map((row, rowIndex) =>
        React.createElement(
          View,
          { key: row.linkId + rowIndex, style: styles.row, wrap: false },
          ...rowToCells(row).map((cell, i) =>
            React.createElement(
              Text,
              {
                key: i,
                style: [
                  styles.cell,
                  { width: COLUMN_WIDTHS[i] },
                  i >= 2 ? styles.right : {},
                ],
              },
              cell,
            ),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: styles.summary },
        ...summaryLines(report).map(([label, value]) =>
          React.createElement(
            View,
            { key: label, style: styles.summaryRow },
            React.createElement(Text, { style: styles.summaryLabel }, label),
            React.createElement(Text, { style: styles.summaryValue }, value),
          ),
        ),
      ),
      React.createElement(
        Text,
        {
          style: styles.footer,
          render: ({ pageNumber, totalPages }: any) =>
            `${pageNumber} / ${totalPages}`,
          fixed: true,
        },
      ),
    ),
  );

  return await renderToBuffer(doc as any);
};
