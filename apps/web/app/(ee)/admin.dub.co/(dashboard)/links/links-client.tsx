"use client";

import { Button, LoadingSpinner } from "@dub/ui";
import { timeAgo } from "@dub/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface AdminLink {
  id: string;
  domain: string;
  key: string;
  shortLink: string;
  url: string;
  clicks: number;
  createdAt: string;
  archived: boolean;
  banned: boolean;
  originKnown: boolean;
  user?: { email: string | null } | null;
}

type SortField = "createdAt" | "clicks" | "lastClicked";
type BannedFilter = "all" | "only" | "exclude";

const SORT_LABELS: Record<SortField, string> = {
  createdAt: "Newest",
  clicks: "Most clicks",
  lastClicked: "Recently clicked",
};

const BANNED_LABELS: Record<BannedFilter, string> = {
  all: "All",
  exclude: "Active only",
  only: "Banned only",
};

export function AdminLinksClient() {
  const [links, setLinks] = useState<AdminLink[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sort, setSort] = useState<SortField>("createdAt");
  const [bannedFilter, setBannedFilter] = useState<BannedFilter>("all");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);

  const fetchLinks = useCallback(() => {
    const params = new URLSearchParams({ sort, page: page.toString() });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (bannedFilter !== "all") params.set("banned", bannedFilter);

    setLinks(null);

    fetch(`/api/admin/links?${params}`)
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
          error instanceof Error ? error.message : "Failed to load links",
        );
      });
  }, [sort, page, debouncedSearch, bannedFilter]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  useEffect(() => {
    fetch("/api/admin/workspaces")
      .then((r) => (r.ok ? r.json() : { workspaces: [] }))
      .then((data) => setWorkspaces(data.workspaces || []))
      .catch(() => setWorkspaces([]));
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val.trim());
      setPage(1);
    }, 400);
  };

  const handleBan = async (link: AdminLink) => {
    const confirmed = window.confirm(
      `Ban ${link.shortLink}?\n\nIt will serve the banned page instead of redirecting to ${link.url}. The slug stays claimed and can be restored later.`,
    );

    if (!confirmed) {
      return;
    }

    setActing(link.id);

    try {
      const res = await fetch(
        `/api/admin/links/ban?domain=${encodeURIComponent(link.domain)}&key=${encodeURIComponent(link.key)}`,
        { method: "DELETE" },
      );
      const data = await res.json();

      if (res.ok) {
        toast.success(`${link.shortLink} banned`);
        fetchLinks();
      } else {
        toast.error(data.error || "Failed to ban link");
      }
    } catch {
      toast.error("Network error. The link was not banned.");
    } finally {
      setActing(null);
    }
  };

  const handleUnban = async (link: AdminLink) => {
    if (!link.originKnown && !destinations[link.id]) {
      toast.error("Choose a destination workspace first");
      return;
    }

    setActing(link.id);

    try {
      const res = await fetch("/api/admin/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: link.domain,
          key: link.key,
          ...(destinations[link.id] && { workspaceId: destinations[link.id] }),
        }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`${data.shortLink} restored to ${data.restoredTo}`);
        fetchLinks();
      } else {
        toast.error(data.error || "Failed to restore link");
      }
    } catch {
      toast.error("Network error. The link was not restored.");
    } finally {
      setActing(null);
    }
  };

  const handleRemove = async (link: AdminLink) => {
    const confirmed = window.confirm(
      `Remove ${link.shortLink} from the banned list?\n\n` +
        `The slug stays permanently claimed and can never be reused. ` +
        `This cannot be undone from the panel.`,
    );

    if (!confirmed) {
      return;
    }

    setActing(link.id);

    try {
      const res = await fetch("/api/admin/banned", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkIds: [link.id] }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Removed. The slug remains claimed.");
        fetchLinks();
      } else {
        toast.error(data.error || "Failed to remove link");
      }
    } catch {
      toast.error("Network error. Nothing was removed.");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-xl px-3 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Links
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          All links across every workspace
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-4 w-4 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by short link or destination..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-8 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setPage(1);
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              <svg
                className="h-4 w-4 text-neutral-400 hover:text-neutral-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => {
            setPage(1);
            setSort(e.target.value as SortField);
          }}
          className="w-auto rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={bannedFilter}
          onChange={(e) => {
            setPage(1);
            setBannedFilter(e.target.value as BannedFilter);
          }}
          className="w-auto rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        >
          {Object.entries(BANNED_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {!debouncedSearch && (
        <p className="mb-3 text-xs text-neutral-400">
          Showing links created in the last 30 days. Search to look further
          back.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {links === null ? (
          <div className="flex h-40 items-center justify-center">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : loadError ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 px-4 text-center">
            <span className="text-sm font-medium text-red-700">
              Could not load links
            </span>
            <span className="text-xs text-red-600">
              {loadError}. This is a failure to load, not an empty list.
            </span>
          </div>
        ) : links.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
            No links found
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Clicks
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-900">
                      {link.shortLink}
                      {link.banned && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          Banned
                        </span>
                      )}
                      {link.archived && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                          Archived
                        </span>
                      )}
                      <div className="text-xs font-normal text-neutral-400">
                        {timeAgo(new Date(link.createdAt))}
                      </div>
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-sm text-neutral-500">
                      {link.url}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-sm text-neutral-500">
                      {link.user?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-neutral-700">
                      {link.clicks}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {link.banned ? (
                        <>
                          {!link.originKnown && (
                            <select
                              value={destinations[link.id] ?? ""}
                              onChange={(e) =>
                                setDestinations((prev) => ({
                                  ...prev,
                                  [link.id]: e.target.value,
                                }))
                              }
                              className="w-auto rounded-md border border-neutral-300 bg-white px-3 py-1 py-2 text-sm text-xs shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                            >
                              <option value="">Restore to...</option>
                              {workspaces.map((workspace) => (
                                <option key={workspace.id} value={workspace.id}>
                                  {workspace.name} ({workspace.slug})
                                </option>
                              ))}
                            </select>
                          )}
                          <button
                            type="button"
                            disabled={acting !== null}
                            onClick={() => handleUnban(link)}
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {acting === link.id ? "Restoring..." : "Restore"}
                          </button>
                          <button
                            type="button"
                            disabled={acting !== null}
                            onClick={() => handleRemove(link)}
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={acting !== null}
                          onClick={() => handleBan(link)}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {acting === link.id ? "Banning..." : "Ban"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {links !== null && !loadError && (page > 1 || links.length === 100) && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
            <span className="text-xs text-neutral-500">Page {page}</span>
            <div className="flex gap-2">
              <Button
                text="Previous"
                variant="secondary"
                disabled={page <= 1}
                className="h-9 w-auto rounded-lg px-4"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Button
                text="Next"
                variant="secondary"
                disabled={links.length < 100}
                className="h-9 w-auto rounded-lg px-4"
                onClick={() => setPage((p) => p + 1)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
