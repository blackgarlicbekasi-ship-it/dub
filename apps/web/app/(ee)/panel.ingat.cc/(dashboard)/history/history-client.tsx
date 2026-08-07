"use client";

import { Button, LoadingSpinner } from "@dub/ui";
import { timeAgo } from "@dub/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Undo is hidden, not removed: the route and the handler below are left intact.
//
// ReplaceLog does not record which match mode a replacement used, and the undo
// route always reverts with `contains` matching. Undoing an exact-match replace
// would therefore rewrite every link whose URL merely contains the new value,
// touching links the original operation never did.
//
// To re-enable: persist the match mode on ReplaceLog (needs the table to exist
// as a Prisma model first), have the undo route read it and apply the same
// exact/contains semantics as the replace route, then flip this to true.
const UNDO_ENABLED = false;

interface LogEntry {
  id: string;
  oldDomain: string;
  newDomain: string;
  linksUpdated: number;
  createdAt: string;
  isUndo: number;
  userEmail?: string;
}

type ClearRange = 7 | 30 | 90;

const CLEAR_LABELS: Record<ClearRange, string> = {
  7: "Older than 7 days",
  30: "Older than 30 days",
  90: "Older than 90 days",
};

export function HistoryClient() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [clearCounts, setClearCounts] = useState<Record<number, number> | null>(
    null,
  );
  const [clearRange, setClearRange] = useState<ClearRange>(30);
  const [clearing, setClearing] = useState(false);

  const fetchLogs = () => {
    fetch("/api/panel/history")
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setClearCounts(data.clearCounts ?? null);
      })
      .catch(() => setLogs([]));
  };

  const handleClear = async () => {
    const count = clearCounts?.[clearRange] ?? 0;

    if (
      !window.confirm(
        `Delete ${count} log ${count === 1 ? "entry" : "entries"} older than ${clearRange} days?\n\n` +
          `This permanently removes the record of those bulk replace operations, including who performed them and what they changed.\n\n` +
          `This cannot be undone.`,
      )
    )
      return;

    setClearing(true);
    try {
      const res = await fetch("/api/panel/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olderThanDays: clearRange }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `${data.deleted} log ${data.deleted === 1 ? "entry" : "entries"} deleted`,
        );
        fetchLogs();
      } else {
        toast.error(data.error || "Failed to clear the log");
      }
    } catch {
      toast.error("Network error. Nothing was deleted.");
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleUndo = async (log: LogEntry) => {
    if (
      !window.confirm(
        `Undo this replacement? This will change ${log.newDomain} back to ${log.oldDomain} in up to ${log.linksUpdated} links.`,
      )
    )
      return;

    setUndoing(log.id);
    try {
      const res = await fetch("/api/panel/replace/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId: log.id }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Undo complete: ${data.updated} links reverted`);
        fetchLogs();
      } else {
        const err = await res.json();
        toast.error(err.error || "Undo failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUndoing(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-lg px-3 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">
            Replace History
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Log of all URL replacements
          </p>
        </div>

        {clearCounts && (
          <div className="flex items-center gap-2">
            <select
              value={clearRange}
              onChange={(e) =>
                setClearRange(Number(e.target.value) as ClearRange)
              }
              className="w-auto rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            >
              {(Object.keys(CLEAR_LABELS) as unknown as ClearRange[]).map(
                (range) => (
                  <option key={range} value={range}>
                    {CLEAR_LABELS[range]} ({clearCounts[range] ?? 0})
                  </option>
                ),
              )}
            </select>
            <Button
              text="Clear log"
              variant="secondary"
              loading={clearing}
              disabled={clearing || (clearCounts[clearRange] ?? 0) === 0}
              className="h-9 w-auto rounded-lg px-4"
              onClick={handleClear}
            />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {logs === null ? (
          <div className="flex h-40 items-center justify-center">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
            No replacement history
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Old Domain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  New Domain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Links
                </th>
                {logs.some((l) => l.userEmail) && (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    User
                  </th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-500">
                    {timeAgo(new Date(log.createdAt))}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-700">
                    {log.oldDomain}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-700">
                    {log.newDomain}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-neutral-700">
                    {log.linksUpdated}
                    {log.isUndo ? (
                      <span className="ml-1.5 text-xs text-amber-600">
                        (undo)
                      </span>
                    ) : null}
                  </td>
                  {logs.some((l) => l.userEmail) && (
                    <td className="px-4 py-3 text-sm text-neutral-500">
                      {log.userEmail || "\u2014"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    {UNDO_ENABLED && !log.isUndo && (
                      <Button
                        text={undoing === log.id ? "Undoing..." : "Undo"}
                        variant="secondary"
                        className="h-7 w-auto rounded-lg px-3 text-xs"
                        loading={undoing === log.id}
                        onClick={() => handleUndo(log)}
                      />
                    )}
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
