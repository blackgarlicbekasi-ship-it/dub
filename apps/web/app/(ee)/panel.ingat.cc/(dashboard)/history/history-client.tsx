"use client";

import { LoadingSpinner } from "@dub/ui";
import { timeAgo } from "@dub/utils";
import { useEffect, useState } from "react";

interface LogEntry {
  id: string;
  oldDomain: string;
  newDomain: string;
  linksUpdated: number;
  createdAt: string;
}

export function HistoryClient() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/panel/history")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => setLogs([]));
  }, []);

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Replace History</h1>
      <p className="mt-1 text-sm text-neutral-500">Log of all URL replacements</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
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
                  Links Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
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
