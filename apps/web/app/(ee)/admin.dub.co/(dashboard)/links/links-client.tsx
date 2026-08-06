"use client";

import { Button, Input, LoadingSpinner } from "@dub/ui";
import { timeAgo } from "@dub/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [sort, setSort] = useState<SortField>("createdAt");
  const [bannedFilter, setBannedFilter] = useState<BannedFilter>("all");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);

  const fetchLinks = useCallback(() => {
    const params = new URLSearchParams({ sort, page: page.toString() });
    if (submittedSearch) params.set("search", submittedSearch);
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
  }, [sort, page, submittedSearch, bannedFilter]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

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
    setActing(link.id);

    try {
      const res = await fetch("/api/admin/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: link.domain, key: link.key }),
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
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSubmittedSearch(search.trim());
          }}
        >
          <Input
            type="text"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            placeholder="Search by short link or destination"
            className="h-9 min-w-[240px] flex-1"
          />
          <Button
            text="Search"
            variant="secondary"
            className="h-9 w-auto"
            type="submit"
          />
        </form>

        <select
          value={sort}
          onChange={(e) => {
            setPage(1);
            setSort(e.target.value as SortField);
          }}
          className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm"
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
          className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm"
        >
          {Object.entries(BANNED_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {!submittedSearch && (
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
                        <Button
                          text="Restore"
                          variant="secondary"
                          loading={acting === link.id}
                          disabled={acting !== null}
                          className="h-8 w-auto"
                          onClick={() => handleUnban(link)}
                        />
                      ) : (
                        <Button
                          text="Ban"
                          variant="danger"
                          loading={acting === link.id}
                          disabled={acting !== null}
                          className="h-8 w-auto"
                          onClick={() => handleBan(link)}
                        />
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
                className="h-8 w-auto"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Button
                text="Next"
                variant="secondary"
                disabled={links.length < 100}
                className="h-8 w-auto"
                onClick={() => setPage((p) => p + 1)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
