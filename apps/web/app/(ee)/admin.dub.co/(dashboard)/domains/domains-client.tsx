"use client";

import { Button, Input, LoadingSpinner } from "@dub/ui";
import { SHORT_DOMAIN, timeAgo } from "@dub/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface DomainInfo {
  slug: string;
  verified: boolean;
  primary: boolean;
  archived: boolean;
  platformWide: boolean;
  platformDefault: boolean;
  createdAt: string;
}

export function DomainsClient() {
  const [domains, setDomains] = useState<DomainInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchDomains = useCallback(() => {
    fetch("/api/admin/domains")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Request failed with status ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setDomains(data.domains || []);
        setLoadError(null);
      })
      .catch((error) => {
        setDomains([]);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load domains",
        );
      });
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);


  const call = async (
    slug: string,
    init: RequestInit,
    onOk: (data: any) => void,
  ) => {
    setBusy(slug);
    try {
      const res = await fetch("/api/admin/domains", init);
      const data = await res.json();
      if (res.ok) {
        onOk(data);
        fetchDomains();
      } else {
        toast.error(data.error || "Request failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  };

  const handleTogglePlatformWide = (d: DomainInfo) =>
    call(
      d.slug,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: d.slug, platformWide: !d.platformWide }),
      },
      () =>
        toast.success(
          d.platformWide
            ? `${d.slug} is no longer available to all users`
            : `${d.slug} is now available to all users`,
        ),
    );

  const handleSetPrimary = (d: DomainInfo) => {
    if (!window.confirm(`Make ${d.slug} the primary domain for everyone?`)) {
      return;
    }
    call(
      d.slug,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: d.slug, action: "set_primary" }),
      },
      (data) => toast.success(data.message || "Primary updated"),
    );
  };

  const handleVerify = async (d: DomainInfo) => {
    setBusy(d.slug);
    try {
      const res = await fetch("/api/admin/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: d.slug }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          data.verified
            ? `${d.slug} is verified`
            : `${d.slug} is not verified yet. Check its DNS records in Vercel.`,
        );
        fetchDomains();
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = (d: DomainInfo) => {
    if (
      !window.confirm(
        `Delete ${d.slug}? This removes it from Vercel and cannot be undone.`,
      )
    ) {
      return;
    }
    call(
      d.slug,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: d.slug }),
      },
      (data) => toast.success(data.message || "Domain deleted"),
    );
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) {
      toast.error("Domain name is required");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newDomain.trim(),
          description: newDescription.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success(`Domain ${newDomain.trim()} added`);
        setNewDomain("");
        setNewDescription("");
        setShowAddForm(false);
        fetchDomains();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add domain");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Domains</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Default domains for shortlink creation
          </p>
        </div>
        <Button
          text="Add Domain"
          className="h-9 w-auto"
          onClick={() => setShowAddForm(!showAddForm)}
        />
      </div>

      {showAddForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">
            Add New Domain
          </h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <label>
              <span className="mb-1.5 block text-sm font-medium text-neutral-700">
                Domain Name
              </span>
              <Input
                type="text"
                placeholder="e.g. pendek.id"
                value={newDomain}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewDomain(e.target.value)
                }
                required
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-neutral-700">
                Description
              </span>
              <Input
                type="text"
                placeholder="e.g. Short domain for Indonesian links"
                value={newDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewDescription(e.target.value)
                }
              />
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                text="Add Domain"
                loading={adding}
                className="h-9 w-auto"
              />
              <Button
                type="button"
                text="Cancel"
                variant="secondary"
                className="h-9 w-auto"
                onClick={() => {
                  setShowAddForm(false);
                  setNewDomain("");
                  setNewDescription("");
                }}
              />
            </div>
            <p className="text-xs text-neutral-400">
              The domain is registered with Vercel and its real status is stored.
              Point its DNS at Vercel, then use Verify.
            </p>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {domains === null ? (
          <div className="flex h-40 items-center justify-center">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : loadError ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 px-4 text-center">
            <span className="text-sm font-medium text-red-700">
              Could not load domains
            </span>
            <span className="text-xs text-red-600">
              {loadError}. This is a failure to load, not an empty list.
            </span>
          </div>
        ) : domains.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
            No domains configured
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Domain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Platform wide
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
              {domains.map((d) => {
                const locked = d.slug === SHORT_DOMAIN;
                return (
                <tr key={d.slug} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                    {d.slug}
                    {d.platformDefault && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Primary
                      </span>
                    )}
                    {d.primary && !d.platformDefault && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Primary
                      </span>
                    )}
                    {d.archived && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        locked || d.verified
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {locked || d.verified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.platformWide
                          ? "bg-green-50 text-green-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {d.platformWide ? "On" : "Off"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-500">
                    {timeAgo(new Date(d.createdAt))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!locked && (
                        <button
                          onClick={() => handleTogglePlatformWide(d)}
                          disabled={busy === d.slug}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                        >
                          {d.platformWide ? "Make private" : "Make platform wide"}
                        </button>
                      )}
                      {!locked && (
                        <button
                          onClick={() => handleVerify(d)}
                          disabled={busy === d.slug}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                        >
                          Verify
                        </button>
                      )}
                      {!locked && !d.platformDefault && (
                        <button
                          onClick={() => handleSetPrimary(d)}
                          disabled={busy === d.slug}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                        >
                          Set as primary
                        </button>
                      )}
                      {!locked && !d.platformDefault && !d.primary && (
                        <button
                          onClick={() => handleDelete(d)}
                          disabled={busy === d.slug}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
