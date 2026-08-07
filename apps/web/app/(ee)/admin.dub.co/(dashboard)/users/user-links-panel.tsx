"use client";

import { Button, Input, LoadingSpinner } from "@dub/ui";
import { timeAgo } from "@dub/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserRow } from "./page-client";

interface LinkRow {
  id: string;
  domain: string;
  key: string;
  shortLink: string;
  url: string;
  clicks: number;
  createdAt: string;
  archived: boolean;
  workspaceSlug: string | null;
}

interface LinksResponse {
  links: LinkRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export function UserLinksPanel({
  user,
  onBack,
}: {
  user: UserRow;
  onBack: () => void;
}) {
  const [data, setData] = useState<LinksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [deletingLink, setDeletingLink] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: "50",
      });
      if (submittedSearch) params.set("search", submittedSearch);
      const res = await fetch(`/api/admin/users/${user.id}/links?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to load links");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [user.id, page, submittedSearch]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedSearch(search.trim());
    setPage(1);
  };

  const handleEditSave = async (linkId: string) => {
    setPendingLink(linkId);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, url: editUrl }),
      });
      if (res.ok) {
        toast.success("Link URL updated");
        setEditingLink(null);
        fetchLinks();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to update link");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPendingLink(null);
    }
  };

  const handleDelete = async (linkId: string) => {
    setPendingLink(linkId);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/links`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
      if (res.ok) {
        toast.success("Link deleted");
        setDeletingLink(null);
        fetchLinks();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to delete link");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPendingLink(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &larr; Back to Users
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Links for {user.name || user.email}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {data ? `${data.total} total links` : "Loading..."}
              {user.workspace && (
                <span className="ml-2">
                  &middot; Workspace: {user.workspace.slug}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Search by key or URL..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            className="h-9 w-full max-w-md"
          />
          <Button
            text="Search"
            type="submit"
            variant="secondary"
            className="h-9 w-auto rounded-lg px-4"
          />
          {search && (
            <Button
              text="Clear"
              type="button"
              variant="secondary"
              className="h-9 w-auto rounded-lg px-4"
              onClick={() => {
                setSearch("");
                setSubmittedSearch("");
                setPage(1);
              }}
            />
          )}
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {loading && !data ? (
          <div className="flex h-60 items-center justify-center">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : !data || data.links.length === 0 ? (
          <div className="flex h-60 items-center justify-center text-sm text-neutral-500">
            No links found
          </div>
        ) : (
          <>
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
                      Clicks
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {data.links.map((link) => (
                    <tr key={link.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-neutral-900">
                          {link.shortLink}
                        </div>
                        {link.archived && (
                          <span className="text-xs text-neutral-400">
                            archived
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingLink === link.id ? (
                          <div className="flex min-w-[22rem] items-center gap-2">
                            <Input
                              type="url"
                              value={editUrl}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                              ) => setEditUrl(e.target.value)}
                              className="w-full max-w-none text-sm"
                            />
                            <Button
                              text="Save"
                              loading={pendingLink === link.id}
                              disabled={pendingLink !== null}
                              className="h-9 w-auto rounded-lg px-4"
                              onClick={() => handleEditSave(link.id)}
                            />
                            <Button
                              text="Cancel"
                              variant="secondary"
                              className="h-9 w-auto rounded-lg px-4"
                              onClick={() => setEditingLink(null)}
                            />
                          </div>
                        ) : (
                          <div
                            className="max-w-xs truncate text-sm text-neutral-500"
                            title={link.url}
                          >
                            {link.url}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums text-neutral-700">
                        {link.clicks.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-500">
                        {timeAgo(new Date(link.createdAt))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingLink !== link.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLink(link.id);
                                setEditUrl(link.url);
                              }}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Edit
                            </button>
                          )}
                          {deletingLink === link.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={pendingLink !== null}
                                onClick={() => handleDelete(link.id)}
                                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {pendingLink === link.id ? "Deleting..." : "Confirm"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingLink(null)}
                                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingLink(link.id)}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
                <div className="text-sm text-neutral-500">
                  Page {data.page} of {data.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    text="Previous"
                    variant="secondary"
                    className="h-9 w-auto rounded-lg px-4"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                  <Button
                    text="Next"
                    variant="secondary"
                    className="h-9 w-auto rounded-lg px-4"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
