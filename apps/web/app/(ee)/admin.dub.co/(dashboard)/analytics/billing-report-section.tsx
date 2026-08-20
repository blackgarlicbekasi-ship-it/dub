"use client";

import { Button, LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ReportRow {
  linkId: string;
  shortLink: string;
  toko: string;
  userId: string | null;
  tier: 1 | 2 | 3;
  deleted: boolean;
  clicks: number;
  share: number;
  vercelAmount: number | null;
  upstashAmount: number | null;
  totalAmount: number | null;
}

interface ReportSummary {
  totalClicks: number;
  rowCount: number;
  periode: string;
  vercelTotal: number | null;
  upstashTotal: number | null;
  grandTotal: number | null;
  vercelLine: string;
  snapshotAt: string;
}

interface Report {
  id: string;
  start: string;
  end: string;
  rows: ReportRow[];
  summary: ReportSummary;
}

interface HistoryItem {
  id: string;
  periode: string;
  start: string;
  end: string;
  vercelTotal: number | null;
  upstashTotal: number | null;
  totalClicks: number;
  createdAt: string;
}

interface AliasRow {
  userId: string;
  email: string | null;
  alias: string | null;
}

const EMPTY = "-";

const money = (value: number | null) =>
  value === null ? EMPTY : value.toFixed(2);

const clicks = (value: number) => value.toLocaleString("en-US");

const percent = (share: number) => `${(share * 100).toFixed(2)}%`;

const toAmount = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);

const isValidAmount = (value: string) => {
  if (value.trim() === "") {
    return true;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0;
};

export function BillingReportSection() {
  const searchParams = useSearchParams();

  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [vercelInput, setVercelInput] = useState("");
  const [upstashInput, setUpstashInput] = useState("");
  const [busy, setBusy] = useState<null | "generate" | "save" | "open">(null);
  const [showAliases, setShowAliases] = useState(false);
  const [aliases, setAliases] = useState<AliasRow[] | null>(null);
  const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({});
  const [savingAlias, setSavingAlias] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = searchParams?.get("start");
    const end = searchParams?.get("end");

    if (start && end) {
      return { start, end, label: `${start} to ${end}` };
    }

    const interval = searchParams?.get("interval") ?? "24h";

    return { interval, label: `interval ${interval}` };
  }, [searchParams]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/billing/reports");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not load report history");
      }

      setHistory(data.reports);
    } catch (e) {
      setHistory([]);
      toast.error(e instanceof Error ? e.message : "Could not load history");
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const openReport = useCallback(async (id: string) => {
    setBusy("open");

    try {
      const res = await fetch(`/api/admin/billing/reports/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not open report");
      }

      setReport(data.report);
      setVercelInput(
        data.report.summary.vercelTotal === null
          ? ""
          : String(data.report.summary.vercelTotal),
      );
      setUpstashInput(
        data.report.summary.upstashTotal === null
          ? ""
          : String(data.report.summary.upstashTotal),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open report");
    } finally {
      setBusy(null);
    }
  }, []);

  const generate = useCallback(
    async (force = false) => {
      if (!isValidAmount(vercelInput) || !isValidAmount(upstashInput)) {
        toast.error("Bill totals must be a non negative number");
        return;
      }

      setBusy("generate");

      try {
        const res = await fetch("/api/admin/billing/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...range,
            vercelTotal: toAmount(vercelInput),
            upstashTotal: toAmount(upstashInput),
            ...(force && { force: true }),
          }),
        });

        const data = await res.json();

        if (res.status === 409 && data.code === "interval_exists") {
          toast.custom(
            () => (
              <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-md">
                <p className="text-sm text-neutral-700">
                  A report for this interval already exists
                  {data.existing?.periode ? ` (${data.existing.periode})` : ""}.
                </p>
                <div className="flex gap-2">
                  <Button
                    text="Open existing"
                    variant="secondary"
                    className="h-8 w-auto rounded-md px-3 text-xs"
                    onClick={() => openReport(data.existing.id)}
                  />
                  <Button
                    text="Create anyway"
                    variant="secondary"
                    className="h-8 w-auto rounded-md px-3 text-xs"
                    onClick={() => generate(true)}
                  />
                </div>
              </div>
            ),
            { duration: 10000 },
          );
          return;
        }

        if (!res.ok) {
          throw new Error(data.error || "Could not generate report");
        }

        setReport(data.report);
        await loadHistory();
        toast.success("Report generated and saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not generate");
      } finally {
        setBusy(null);
      }
    },
    [range, vercelInput, upstashInput, loadHistory, openReport],
  );

  const regenerate = useCallback(async () => {
    if (!report) {
      return;
    }

    if (!isValidAmount(vercelInput) || !isValidAmount(upstashInput)) {
      toast.error("Bill totals must be a non negative number");
      return;
    }

    setBusy("save");

    try {
      const res = await fetch(`/api/admin/billing/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vercelTotal: toAmount(vercelInput),
          upstashTotal: toAmount(upstashInput),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not update report");
      }

      setReport(data.report);
      await loadHistory();
      toast.success("Report recomputed from the saved snapshot");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusy(null);
    }
  }, [report, vercelInput, upstashInput, loadHistory]);

  const loadAliases = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/billing/aliases");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not load aliases");
      }

      setAliases(data.aliases);
      setAliasDrafts(
        Object.fromEntries(
          data.aliases.map((a: AliasRow) => [a.userId, a.alias ?? ""]),
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load aliases");
    }
  }, []);

  const saveAlias = useCallback(
    async (userId: string) => {
      setSavingAlias(userId);

      try {
        const res = await fetch("/api/admin/billing/aliases", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, alias: aliasDrafts[userId] ?? "" }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Could not save alias");
        }

        toast.success("Alias saved");
        await loadAliases();

        if (report) {
          await openReport(report.id);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save alias");
      } finally {
        setSavingAlias(null);
      }
    },
    [aliasDrafts, loadAliases, report, openReport],
  );

  const download = (format: "csv" | "xlsx" | "pdf") => {
    if (!report) {
      return;
    }

    window.location.href = `/api/admin/billing/reports/${report.id}/export?format=${format}`;
  };

  return (
    <div className="mt-10 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Billing report
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Allocates the infrastructure bill across shortlinks by click share
          </p>
        </div>
        <Button
          text={showAliases ? "Hide aliases" : "Edit Toko aliases"}
          variant="secondary"
          className="h-9 w-auto rounded-lg px-4"
          onClick={() => {
            setShowAliases((v) => !v);
            if (!aliases) {
              loadAliases();
            }
          }}
        />
      </div>

      {showAliases && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Toko aliases
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Applied when a report is displayed, so changing one relabels every
              report without changing any amount
            </p>
          </div>
          {!aliases ? (
            <div className="flex h-24 items-center justify-center">
              <LoadingSpinner className="h-5 w-5" />
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {aliases.map((row) => (
                <div
                  key={row.userId}
                  className="flex flex-wrap items-center gap-3 px-4 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">
                    {row.email || row.userId}
                  </span>
                  <input
                    value={aliasDrafts[row.userId] ?? ""}
                    onChange={(e) =>
                      setAliasDrafts((d) => ({
                        ...d,
                        [row.userId]: e.target.value,
                      }))
                    }
                    placeholder="No alias"
                    className="w-56 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                  <Button
                    text="Save"
                    variant="secondary"
                    loading={savingAlias === row.userId}
                    disabled={(aliasDrafts[row.userId] ?? "") === (row.alias ?? "")}
                    className="h-8 w-auto rounded-md px-3 text-xs"
                    onClick={() => saveAlias(row.userId)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          {report ? "Bill totals" : "New report"}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          {report
            ? `Editing ${report.summary.periode}. Amounts recompute from the saved snapshot, Tinybird is not queried again.`
            : `Uses the date range selected above: ${range.label}`}
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-600">
              Vercel total (USD)
            </span>
            <input
              inputMode="decimal"
              value={vercelInput}
              onChange={(e) => setVercelInput(e.target.value)}
              placeholder="not entered"
              className="w-44 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-600">
              Upstash total (USD)
            </span>
            <input
              inputMode="decimal"
              value={upstashInput}
              onChange={(e) => setUpstashInput(e.target.value)}
              placeholder="not entered"
              className="w-44 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
          </label>

          {report ? (
            <>
              <Button
                text="Recompute"
                loading={busy === "save"}
                className="h-10 w-auto rounded-lg px-4"
                onClick={regenerate}
              />
              <Button
                text="New report"
                variant="secondary"
                className="h-10 w-auto rounded-lg px-4"
                onClick={() => {
                  setReport(null);
                  setVercelInput("");
                  setUpstashInput("");
                }}
              />
            </>
          ) : (
            <Button
              text="Generate and save"
              loading={busy === "generate"}
              className="h-10 w-auto rounded-lg px-4"
              onClick={() => generate(false)}
            />
          )}
        </div>

        {report && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              text="Download CSV"
              variant="secondary"
              className="h-9 w-auto rounded-lg px-4"
              onClick={() => download("csv")}
            />
            <Button
              text="Download Excel"
              variant="secondary"
              className="h-9 w-auto rounded-lg px-4"
              onClick={() => download("xlsx")}
            />
            <Button
              text="Download PDF"
              variant="secondary"
              className="h-9 w-auto rounded-lg px-4"
              onClick={() => download("pdf")}
            />
          </div>
        )}
      </div>

      {report && <ReportView report={report} />}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Saved reports
          </p>
        </div>
        {history === null ? (
          <div className="flex h-24 items-center justify-center">
            <LoadingSpinner className="h-5 w-5" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-neutral-500">
            No saved reports yet
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                {["Periode", "Clicks", "Vercel($)", "Upstash($)", "Created"].map(
                  (h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500",
                        h !== "Periode" && "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {history.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openReport(item.id)}
                  className={cn(
                    "cursor-pointer hover:bg-neutral-50",
                    report?.id === item.id && "bg-neutral-50",
                  )}
                >
                  <td className="px-4 py-2.5 text-sm text-neutral-700">
                    {item.periode}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums text-neutral-700">
                    {clicks(item.totalClicks)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right text-sm tabular-nums",
                      item.vercelTotal === null
                        ? "text-neutral-400"
                        : "text-neutral-700",
                    )}
                  >
                    {money(item.vercelTotal)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right text-sm tabular-nums",
                      item.upstashTotal === null
                        ? "text-neutral-400"
                        : "text-neutral-700",
                    )}
                  >
                    {money(item.upstashTotal)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-neutral-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ReportView({ report }: { report: Report }) {
  const pending: string[] = [];

  if (report.summary.vercelTotal === null) {
    pending.push("Vercel");
  }

  if (report.summary.upstashTotal === null) {
    pending.push("Upstash");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {pending.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {pending.join(" and ")} {pending.length === 1 ? "total is" : "totals are"}{" "}
          not entered yet, shown as {EMPTY}. Enter the amount above and recompute
          when the bill arrives.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              {[
                "Toko",
                "URL",
                "Click",
                "Percent",
                "Vercel($)",
                "Upstash($)",
                "Total($)",
              ].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500",
                    i >= 2 && "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {report.rows.map((row) => (
              <tr key={row.linkId} className="hover:bg-neutral-50">
                <td className="max-w-[240px] truncate px-4 py-2 text-sm text-neutral-700">
                  {row.toko}
                  {row.deleted && (
                    <span
                      className="ml-1.5 text-xs text-amber-600"
                      title="Link deleted, owner recovered from analytics metadata"
                    >
                      deleted
                    </span>
                  )}
                </td>
                <td className="max-w-[220px] truncate px-4 py-2 text-sm text-neutral-500">
                  {row.shortLink}
                </td>
                <td className="px-4 py-2 text-right text-sm tabular-nums text-neutral-700">
                  {clicks(row.clicks)}
                </td>
                <td className="px-4 py-2 text-right text-sm tabular-nums text-neutral-500">
                  {percent(row.share)}
                </td>
                <td
                  className={cn(
                    "px-4 py-2 text-right text-sm tabular-nums",
                    row.vercelAmount === null
                      ? "text-neutral-400"
                      : "text-neutral-700",
                  )}
                >
                  {money(row.vercelAmount)}
                </td>
                <td
                  className={cn(
                    "px-4 py-2 text-right text-sm tabular-nums",
                    row.upstashAmount === null
                      ? "text-neutral-400"
                      : "text-neutral-700",
                  )}
                >
                  {money(row.upstashAmount)}
                </td>
                <td className="px-4 py-2 text-right text-sm font-medium tabular-nums text-neutral-900">
                  {money(row.totalAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-1.5 border-t border-neutral-200 bg-neutral-50 px-4 py-4 text-sm">
        <div className="flex gap-3">
          <span className="w-28 font-medium text-neutral-500">TOTAL CLICK</span>
          <span className="tabular-nums text-neutral-900">
            {clicks(report.summary.totalClicks)}
          </span>
        </div>
        <div className="flex gap-3">
          <span className="w-28 font-medium text-neutral-500">PERIODE</span>
          <span className="text-neutral-900">{report.summary.periode}</span>
        </div>
        <div className="flex gap-3">
          <span className="w-28 font-medium text-neutral-500">TOTAL</span>
          <span className="tabular-nums text-neutral-900">
            {money(report.summary.grandTotal)}
          </span>
        </div>
        <div className="flex gap-3">
          <span className="w-28 font-medium text-neutral-500">VERCEL</span>
          <span className="text-neutral-900">{report.summary.vercelLine}</span>
        </div>
      </div>
    </div>
  );
}
