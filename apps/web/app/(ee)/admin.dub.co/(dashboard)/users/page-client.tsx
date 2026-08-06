"use client";

import { Button, LoadingSpinner, useMediaQuery } from "@dub/ui";
import { cn, timeAgo } from "@dub/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CreateUserModal } from "./create-user-modal";
import { UserActionsMenu } from "./user-actions-menu";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  totalLinks: number;
  totalClicks: number;
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  lockedAt: string | null;
  invalidLoginAttempts: number;
  telegramEnabled: boolean;
  workspace: Workspace | null;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export function UsersPageClient() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isMobile } = useMediaQuery();
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: "20",
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to load users");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
    }, 400);
  };

  return (
    <div className="mx-auto w-full max-w-screen-xl px-3 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Users</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {data ? `${data.total} total users` : "Loading..."}
          </p>
        </div>
        <Button
          text="Create User"
          onClick={() => setShowCreateModal(true)}
          className="h-9 w-auto rounded-lg px-4"
        />
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-8 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              <svg className="h-4 w-4 text-neutral-400 hover:text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {loading && !data ? (
          <div className="flex h-60 items-center justify-center">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : !data || data.users.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-2">
            <div className="rounded-full bg-neutral-100 p-3">
              <svg className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-sm text-neutral-500">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      User
                    </th>
                    {!isMobile && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Workspace
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Plan
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Links
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Created
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.users.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-neutral-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 text-xs font-semibold text-neutral-600">
                            {(user.name || user.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            {user.name && (
                              <div className="truncate text-sm font-medium text-neutral-900">
                                {user.name}
                              </div>
                            )}
                            <div className="truncate text-sm text-neutral-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      {!isMobile && (
                        <>
                          <td className="px-4 py-3 text-sm text-neutral-700">
                            {user.workspace ? (
                              <span className="font-medium text-neutral-900">
                                {user.workspace.slug}
                              </span>
                            ) : (
                              <span className="text-neutral-300">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {user.workspace ? (
                              <PlanBadge plan={user.workspace.plan} />
                            ) : (
                              <span className="text-sm text-neutral-300">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge lockedAt={user.lockedAt} />
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-neutral-700">
                            {user.workspace ? user.workspace.totalLinks : 0}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-500">
                            {timeAgo(new Date(user.createdAt))}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-right">
                        <UserActionsMenu
                          user={user}
                          onUpdate={fetchUsers}
                          onViewLinks={() => {}}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
                <p className="text-sm text-neutral-500">
                  Page {data.page} of {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: "bg-neutral-100 text-neutral-600",
    pro: "bg-blue-50 text-blue-700",
    business: "bg-purple-50 text-purple-700",
    enterprise: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        colors[plan] || colors.free,
      )}
    >
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  );
}

function StatusBadge({ lockedAt }: { lockedAt: string | null }) {
  if (lockedAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        Suspended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      Active
    </span>
  );
}
