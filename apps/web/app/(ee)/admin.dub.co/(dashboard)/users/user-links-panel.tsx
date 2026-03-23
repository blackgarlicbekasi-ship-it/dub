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
  const [page, setPage] = useState(1);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [deletingLink, setDeletingLink] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: "50",
      });
      if (search) params.set("search", search);
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
  }, [user.id, page, search]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLinks();
  };

  const handleEditSave = async (linkId: string) => {
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
    }
  };

  const handleDelete = async (linkId: string) => {
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
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="mb-4 text-sm text-neutral-500 hover:text-neutral-700"
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
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="max-w-xs flex-1">
            <Input
              type="text"
              placeholder="Search by key or URL..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
            />
          </div>
          <Button
            text="Search"
            type="submit"
            variant="secondary"
            className="h-9"
          />
          {search && (
            <Button
              text="Clear"
              variant="secondary"
              className="h-9"
              onClick={() => {
                setSearch("");
                setPage(1);
                setTimeout(fetchLinks, 0);
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
                      <td className="max-w-xs px-4 py-3">
                        {editingLink === link.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="url"
                              value={editUrl}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                              ) => setEditUrl(e.target.value)}
                              className="h-8 text-sm"
                            />
                            <Button
                              text="Save"
                              className="h-8 text-xs"
                              onClick={() => handleEditSave(link.id)}
                            />
                            <Button
                              text="Cancel"
                              variant="secondary"
                              className="h-8 text-xs"
                              onClick={() => setEditingLink(null)}
                            />
                          </div>
                        ) : (
                          <div
                            className="truncate text-sm text-neutral-500"
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
                              onClick={() => {
                                setEditingLink(link.id);
                                setEditUrl(link.url);
                              }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                          )}
                          {deletingLink === link.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(link.id)}
                                className="text-xs font-medium text-red-600 hover:underline"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingLink(null)}
                                className="text-xs text-neutral-500 hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingLink(link.id)}
                              className="text-xs text-red-600 hover:underline"
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
                    className="h-8 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                  <Button
                    text="Next"
                    variant="secondary"
                    className="h-8 text-xs"
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
