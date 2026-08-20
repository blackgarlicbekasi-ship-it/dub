"use client";

import { groupRowsByOwner } from "@/lib/analytics/billing/group";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { fixedSummaryLines } from "@/lib/analytics/billing/summary-lines";
import { Button, LoadingSpinner, TabSelect } from "@dub/ui";
import { cn } from "@dub/utils";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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

type TabId = "create" | "history" | "aliases";

const TABS: { id: TabId; label: string }[] = [
  { id: "create", label: "Create report" },
  { id: "history", label: "History" },
  { id: "aliases", label: "Aliases" },
];

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

  const [tab, setTab] = useState<TabId>("create");
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [vercelInput, setVercelInput] = useState("");
  const [upstashInput, setUpstashInput] = useState("");
  const [busy, setBusy] = useState<null | "generate" | "save" | "open">(null);

  const range = useMemo(() => {
    const start = searchParams?.get("start");
    const end = searchParams?.get("end");

    if (start && end) {
      return { start, end, label: `${start} to ${end}` };
    }

    const interval = searchParams?.get("interval") ?? "30d";

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

  const applyReport = useCallback((next: Report) => {
    setReport(next);
    setVercelInput(
      next.summary.vercelTotal === null ? "" : String(next.summary.vercelTotal),
    );
    setUpstashInput(
      next.summary.upstashTotal === null
        ? ""
        : String(next.summary.upstashTotal),
    );
  }, []);

  const openReport = useCallback(
    async (id: string, { focus = true }: { focus?: boolean } = {}) => {
      setBusy("open");

      try {
        const res = await fetch(`/api/admin/billing/reports/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Could not open report");
        }

        applyReport(data.report);

        if (focus) {
          setTab("create");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not open report");
      } finally {
        setBusy(null);
      }
    },
    [applyReport],
  );

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

        applyReport(data.report);
        await loadHistory();
        toast.success("Report generated and saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not generate");
      } finally {
        setBusy(null);
      }
    },
    [range, vercelInput, upstashInput, loadHistory, openReport, applyReport],
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

      applyReport(data.report);
      await loadHistory();
      toast.success("Report recomputed from the saved snapshot");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusy(null);
    }
  }, [report, vercelInput, upstashInput, loadHistory, applyReport]);

  const startNew = useCallback(() => {
    setReport(null);
    setVercelInput("");
    setUpstashInput("");
  }, []);

  const download = useCallback(
    (format: "csv" | "xlsx" | "pdf") => {
      if (!report) {
        return;
      }

      window.location.href = `/api/admin/billing/reports/${report.id}/export?format=${format}`;
    },
    [report],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">
            Billing report
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Allocates the infrastructure bill across shortlinks by click share
          </p>
        </div>
        <SimpleDateRangePicker
          className="w-full sm:w-fit"
          align="end"
          defaultInterval="30d"
        />
      </div>

      <div className="border-b border-neutral-200">
        <TabSelect
          options={TABS.map(({ id, label }) => ({ id, label }))}
          selected={tab}
          onSelect={(id) => setTab(id as TabId)}
        />
      </div>

      {tab === "create" && (
        <CreateTab
          range={range}
          report={report}
          busy={busy}
          vercelInput={vercelInput}
          upstashInput={upstashInput}
          setVercelInput={setVercelInput}
          setUpstashInput={setUpstashInput}
          onGenerate={() => generate(false)}
          onRegenerate={regenerate}
          onStartNew={startNew}
          onDownload={download}
        />
      )}

      {tab === "history" && (
        <HistoryTab
          history={history}
          openReportId={report?.id ?? null}
          onOpen={(id) => openReport(id)}
        />
      )}

      {tab === "aliases" && (
        <AliasesTab
          onAliasSaved={() => {
            if (report) {
              return openReport(report.id, { focus: false });
            }

            return Promise.resolve();
          }}
        />
      )}
    </div>
  );
}

function CreateTab({
  range,
  report,
  busy,
  vercelInput,
  upstashInput,
  setVercelInput,
  setUpstashInput,
  onGenerate,
  onRegenerate,
  onStartNew,
  onDownload,
}: {
  range: { label: string };
  report: Report | null;
  busy: null | "generate" | "save" | "open";
  vercelInput: string;
  upstashInput: string;
  setVercelInput: (v: string) => void;
  setUpstashInput: (v: string) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onStartNew: () => void;
  onDownload: (format: "csv" | "xlsx" | "pdf") => void;
}) {
  return (
    <div className="flex flex-col gap-6">
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
                onClick={onRegenerate}
              />
              <Button
                text="New report"
                variant="secondary"
                className="h-10 w-auto rounded-lg px-4"
                onClick={onStartNew}
              />
            </>
          ) : (
            <Button
              text="Generate and save"
              loading={busy === "generate"}
              className="h-10 w-auto rounded-lg px-4"
              onClick={onGenerate}
            />
          )}
        </div>

        {report && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              text="Download CSV"
              variant="secondary"
              className="h-9 w-auto rounded-lg px-4"
              onClick={() => onDownload("csv")}
            />
            <Button
              text="Download Excel"
              variant="secondary"
              className="h-9 w-auto rounded-lg px-4"
              onClick={() => onDownload("xlsx")}
            />
            <Button
              text="Download PDF"
              variant="secondary"
              className="h-9 w-auto rounded-lg px-4"
              onClick={() => onDownload("pdf")}
            />
          </div>
        )}
      </div>

      {busy === "open" && !report ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-neutral-200 bg-white">
          <LoadingSpinner className="h-5 w-5" />
        </div>
      ) : (
        report && <ReportView report={report} />
      )}
    </div>
  );
}

function HistoryTab({
  history,
  openReportId,
  onOpen,
}: {
  history: HistoryItem[] | null;
  openReportId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Saved reports
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          One report per interval. Open one to fill in a bill total that arrived
          later.
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
                onClick={() => onOpen(item.id)}
                className={cn(
                  "cursor-pointer hover:bg-neutral-50",
                  openReportId === item.id && "bg-neutral-50",
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
  );
}

function AliasesTab({ onAliasSaved }: { onAliasSaved: () => Promise<void> }) {
  const [aliases, setAliases] = useState<AliasRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const loadAliases = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/billing/aliases");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not load aliases");
      }

      setAliases(data.aliases);
      setDrafts(
        Object.fromEntries(
          data.aliases.map((a: AliasRow) => [a.userId, a.alias ?? ""]),
        ),
      );
    } catch (e) {
      setAliases([]);
      toast.error(e instanceof Error ? e.message : "Could not load aliases");
    }
  }, []);

  useEffect(() => {
    loadAliases();
  }, [loadAliases]);

  const saveAlias = useCallback(
    async (userId: string) => {
      setSaving(userId);

      try {
        const res = await fetch("/api/admin/billing/aliases", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, alias: drafts[userId] ?? "" }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Could not save alias");
        }

        toast.success("Alias saved");
        await loadAliases();
        await onAliasSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save alias");
      } finally {
        setSaving(null);
      }
    },
    [drafts, loadAliases, onAliasSaved],
  );

  return (
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
      {aliases === null ? (
        <div className="flex h-24 items-center justify-center">
          <LoadingSpinner className="h-5 w-5" />
        </div>
      ) : aliases.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-sm text-neutral-500">
          No users found
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
                value={drafts[row.userId] ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [row.userId]: e.target.value }))
                }
                placeholder="No alias"
                className="w-56 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
              <Button
                text="Save"
                variant="secondary"
                loading={saving === row.userId}
                disabled={(drafts[row.userId] ?? "") === (row.alias ?? "")}
                className="h-8 w-auto rounded-md px-3 text-xs"
                onClick={() => saveAlias(row.userId)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportView({ report }: { report: Report }) {
  const groups = groupRowsByOwner(report.rows, report.summary.totalClicks);
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
          {pending.join(" and ")}{" "}
          {pending.length === 1 ? "total is" : "totals are"} not entered yet,
          shown as {EMPTY}. Enter the amount above and recompute when the bill
          arrives.
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
            {groups.map((group) => (
              <Fragment key={group.key}>
                <tr className="bg-neutral-50/80">
                  <td className="max-w-[240px] truncate px-4 py-2 text-sm font-semibold text-neutral-900">
                    {group.toko}
                    <span className="ml-1.5 text-xs font-normal text-neutral-400">
                      {group.rows.length}
                      {group.rows.length === 1 ? " link" : " links"}
                    </span>
                  </td>
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums text-neutral-900">
                    {clicks(group.subtotal.clicks)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums text-neutral-600">
                    {percent(group.subtotal.share)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right text-sm font-semibold tabular-nums",
                      group.subtotal.vercelAmount === null
                        ? "text-neutral-400"
                        : "text-neutral-900",
                    )}
                  >
                    {money(group.subtotal.vercelAmount)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right text-sm font-semibold tabular-nums",
                      group.subtotal.upstashAmount === null
                        ? "text-neutral-400"
                        : "text-neutral-900",
                    )}
                  >
                    {money(group.subtotal.upstashAmount)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums text-neutral-900">
                    {money(group.subtotal.totalAmount)}
                  </td>
                </tr>

                {group.rows.map((row) => (
                  <tr key={row.linkId} className="hover:bg-neutral-50">
                    <td className="px-4 py-2" />
                    <td className="max-w-[220px] truncate px-4 py-2 pl-8 text-sm text-neutral-600">
                      {row.shortLink}
                      {row.deleted && (
                        <span
                          className="ml-1.5 text-xs text-amber-600"
                          title="Link deleted, owner recovered from analytics metadata"
                        >
                          deleted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-sm tabular-nums text-neutral-600">
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
                          : "text-neutral-600",
                      )}
                    >
                      {money(row.vercelAmount)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right text-sm tabular-nums",
                        row.upstashAmount === null
                          ? "text-neutral-400"
                          : "text-neutral-600",
                      )}
                    >
                      {money(row.upstashAmount)}
                    </td>
                    <td className="px-4 py-2 text-right text-sm tabular-nums text-neutral-700">
                      {money(row.totalAmount)}
                    </td>
                  </tr>
                ))}
              </Fragment>
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
        {fixedSummaryLines(report.summary.vercelLine).map(([label, value]) => (
          <div key={label} className="flex gap-3">
            <span className="w-28 font-medium text-neutral-500">{label}</span>
            <span className="text-neutral-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
