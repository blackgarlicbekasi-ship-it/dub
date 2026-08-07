"use client";

import { Button, LoadingSpinner } from "@dub/ui";
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
  originKnown: boolean;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export function BannedClient() {
  const [links, setLinks] = useState<BannedLink[] | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const fetchBanned = useCallback(() => {
    setSelected(new Set());
    fetch("/api/admin/banned")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Request failed with status ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setLinks(data.links);
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
    fetch("/api/admin/workspaces")
      .then((r) => (r.ok ? r.json() : { workspaces: [] }))
      .then((data) => setWorkspaces(data.workspaces || []))
      .catch(() => setWorkspaces([]));
  }, [fetchBanned]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === (links?.length ?? 0)
        ? new Set()
        : new Set((links ?? []).map((link) => link.id)),
    );
  };

  const restore = async (targets: BannedLink[]) => {
    const blocked = targets.filter(
      (link) => !link.originKnown && !destinations[link.id],
    );

    if (blocked.length > 0) {
      toast.error(
        `Choose a destination workspace for ${blocked.map((l) => l.shortLink).join(", ")}`,
      );
      return;
    }

    setPending(true);
    let restored = 0;

    try {
      for (const link of targets) {
        const res = await fetch("/api/admin/unban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: link.domain,
            key: link.key,
            ...(destinations[link.id] && { workspaceId: destinations[link.id] }),
          }),
        });

        if (res.ok) {
          restored += 1;
        } else {
          const data = await res.json();
          toast.error(`${link.shortLink}: ${data.error || "restore failed"}`);
        }
      }

      if (restored > 0) {
        toast.success(`${restored} link${restored === 1 ? "" : "s"} restored`);
      }
      fetchBanned();
    } catch {
      toast.error("Network error. Some links may not have been restored.");
    } finally {
      setPending(false);
    }
  };

  const remove = async (targets: BannedLink[]) => {
    const confirmed = window.confirm(
      `Remove ${targets.length} link${targets.length === 1 ? "" : "s"} from the banned list?\n\n` +
        `The slug${targets.length === 1 ? "" : "s"} stay permanently claimed and can never be reused. ` +
        `This cannot be undone from the panel.`,
    );

    if (!confirmed) {
      return;
    }

    setPending(true);

    try {
      const res = await fetch("/api/admin/banned", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkIds: targets.map((link) => link.id) }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`${data.removed} removed. Slugs remain claimed.`);
        fetchBanned();
      } else {
        toast.error(data.error || "Failed to remove links");
      }
    } catch {
      toast.error("Network error. Nothing was removed.");
    } finally {
      setPending(false);
    }
  };

  const selectedLinks = (links ?? []).filter((link) => selected.has(link.id));

  return (
    <div className="mx-auto w-full max-w-screen-xl px-3 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Banned Links
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Links held in quarantine. They serve the banned page and their slugs
          stay claimed.
        </p>
      </div>

      {selectedLinks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <span className="text-sm text-neutral-700">
            {selectedLinks.length} selected
          </span>
          <Button
            text="Restore selected"
            variant="secondary"
            loading={pending}
            disabled={pending}
            className="h-9 w-auto rounded-lg px-4"
            onClick={() => restore(selectedLinks)}
          />
          <Button
            text="Delete selected"
            variant="danger"
            loading={pending}
            disabled={pending}
            className="h-9 w-auto rounded-lg px-4"
            onClick={() => remove(selectedLinks)}
          />
        </div>
      )}

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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      aria-label="Select all banned links"
                      checked={selected.size === links.length}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500"
                    />
                  </th>
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${link.shortLink}`}
                        checked={selected.has(link.id)}
                        onChange={() => toggle(link.id)}
                        className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-900">
                      {link.shortLink}
                      <div className="text-xs font-normal text-neutral-400">
                        {timeAgo(new Date(link.createdAt))}
                      </div>
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-sm text-neutral-500">
                      {link.url}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-neutral-700">
                      {link.clicks}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!link.originKnown && (
                          <select
                            value={destinations[link.id] ?? ""}
                            onChange={(e) =>
                              setDestinations((prev) => ({
                                ...prev,
                                [link.id]: e.target.value,
                              }))
                            }
                            className="w-auto rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                          >
                            <option value="">Choose workspace...</option>
                            {workspaces.map((workspace) => (
                              <option key={workspace.id} value={workspace.id}>
                                {workspace.name} ({workspace.slug})
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => restore([link])}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => remove([link])}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
