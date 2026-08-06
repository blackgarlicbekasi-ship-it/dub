"use client";

import { Button, Input, LoadingSpinner } from "@dub/ui";
import { timeAgo } from "@dub/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface BannedLink {
  id: string;
  domain: string;
  key: string;
  shortLink: string;
  url: string;
  clicks: number;
  createdAt: string;
}

export function BannedClient() {
  const [links, setLinks] = useState<BannedLink[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [workspaceSlugs, setWorkspaceSlugs] = useState<Record<string, string>>(
    {},
  );

  const fetchBanned = useCallback(() => {
    fetch("/api/admin/links?banned=only")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Request failed with status ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setLinks(data);
        setLoadError(null);
      })
      .catch((error) => {
        setLinks([]);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load banned links",
        );
      });
  }, []);

  useEffect(() => {
    fetchBanned();
  }, [fetchBanned]);

  const handleRestore = async (link: BannedLink) => {
    const workspaceId = workspaceSlugs[link.id]?.trim();

    const confirmed = window.confirm(
      `Restore ${link.shortLink}?\n\nIt will stop serving the banned page and redirect to ${link.url} again.`,
    );

    if (!confirmed) {
      return;
    }

    setRestoring(link.id);

    try {
      const res = await fetch("/api/admin/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: link.domain,
          key: link.key,
          ...(workspaceId && { workspaceId }),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`${data.shortLink} restored to ${data.restoredTo}`);
        fetchBanned();
      } else {
        toast.error(data.error || "Failed to restore link");
      }
    } catch {
      toast.error("Network error. The link was not restored.");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-lg px-3 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Banned Links
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Links held in quarantine. They serve the banned page and their slugs
          stay claimed.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {links === null ? (
          <div className="flex h-40 items-center justify-center">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : loadError ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 px-4 text-center">
            <span className="text-sm font-medium text-red-700">
              Could not load banned links
            </span>
            <span className="text-xs text-red-600">
              {loadError}. This is a failure to load, not an empty list.
            </span>
          </div>
        ) : links.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
            No banned links
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Short Link
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Destination
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Clicks
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Restore
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                    {link.shortLink}
                    <div className="text-xs font-normal text-neutral-400">
                      {timeAgo(new Date(link.createdAt))}
                    </div>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-sm text-neutral-500">
                    {link.url}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-neutral-700">
                    {link.clicks}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        type="text"
                        placeholder="workspace id (if needed)"
                        className="h-8 w-52 text-xs"
                        value={workspaceSlugs[link.id] ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setWorkspaceSlugs((prev) => ({
                            ...prev,
                            [link.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        text="Restore"
                        variant="secondary"
                        loading={restoring === link.id}
                        disabled={restoring !== null}
                        className="h-8 w-auto"
                        onClick={() => handleRestore(link)}
                      />
                    </div>
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
