"use client";

import { Button, LoadingSpinner } from "@dub/ui";
import { timeAgo } from "@dub/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface LogEntry {
  id: string;
  oldDomain: string;
  newDomain: string;
  linksUpdated: number;
  createdAt: string;
  isUndo: number;
  userEmail?: string;
}

export function HistoryClient() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);

  const fetchLogs = () => {
    fetch("/api/panel/history")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => setLogs([]));
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleUndo = async (log: LogEntry) => {
    if (!window.confirm(
      `Undo this replacement? This will change ${log.newDomain} back to ${log.oldDomain} in up to ${log.linksUpdated} links.`
    )) return;

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
    } catch { toast.error("Network error"); }
    finally { setUndoing(null); }
  };

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">Replace History</h1>
        <p className="mt-1 text-sm text-neutral-500">Log of all URL replacements</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {logs === null ? (
          <div className="flex h-40 items-center justify-center"><LoadingSpinner className="h-6 w-6" /></div>
        ) : logs.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-neutral-500">No replacement history</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Old Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">New Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Links</th>
                {logs.some((l) => l.userEmail) && (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">User</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-500">{timeAgo(new Date(log.createdAt))}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{log.oldDomain}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{log.newDomain}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-neutral-700">
                    {log.linksUpdated}
                    {log.isUndo ? <span className="ml-1.5 text-xs text-amber-600">(undo)</span> : null}
                  </td>
                  {logs.some((l) => l.userEmail) && (
                    <td className="px-4 py-3 text-sm text-neutral-500">{log.userEmail || "\u2014"}</td>
                  )}
                  <td className="px-4 py-3 text-right">
                    {!log.isUndo && (
                      <Button
                        text={undoing === log.id ? "Undoing..." : "Undo"}
                        variant="secondary"
                        className="h-7 text-xs"
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
