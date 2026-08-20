import type { ResolvedReport } from "../report";
import { COLUMNS, reportToRenderRows, summaryLines } from "./shared";

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
    subtotalRow: {
      flexDirection: "row",
      backgroundColor: "#F9FAFB",
      borderBottomWidth: 0.5,
      borderBottomColor: "#D1D5DB",
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    subtotalCell: { fontFamily: "Helvetica-Bold", fontSize: 8 },
    slugCell: { fontSize: 8, color: "#4B5563" },
    indent: { paddingLeft: 8 },
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
    summaryValue: { fontSize: 9, width: 70 },
    summaryNote: { fontSize: 9, color: "#4B5563" },
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
      ...reportToRenderRows(report).map(({ kind, cells }, rowIndex) =>
        React.createElement(
          View,
          {
            key: `${kind}-${rowIndex}`,
            style: kind === "subtotal" ? styles.subtotalRow : styles.row,
            wrap: false,
          },
          ...cells.map((cell, i) =>
            React.createElement(
              Text,
              {
                key: i,
                style: [
                  kind === "subtotal" ? styles.subtotalCell : styles.slugCell,
                  { width: COLUMN_WIDTHS[i] },
                  i >= 2 ? styles.right : {},
                  kind === "slug" && i === 1 ? styles.indent : {},
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
        ...summaryLines(report).map(({ label, value, note }) =>
          React.createElement(
            View,
            { key: label, style: styles.summaryRow },
            React.createElement(Text, { style: styles.summaryLabel }, label),
            React.createElement(Text, { style: styles.summaryValue }, value),
            note
              ? React.createElement(Text, { style: styles.summaryNote }, note)
              : null,
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
