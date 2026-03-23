"use client";

import { Button, Input, LoadingSpinner, useMediaQuery } from "@dub/ui";
import { cn, timeAgo } from "@dub/utils";
import { useCallback, useEffect, useState } from "react";
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Users</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {data ? `${data.total} total users` : "Loading..."}
          </p>
        </div>
        <Button
          text="Create User"
          onClick={() => setShowCreateModal(true)}
          className="h-9"
        />
      </div>

      <div className="mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="max-w-xs flex-1">
            <Input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
            />
          </div>
          <Button text="Search" type="submit" variant="secondary" className="h-9" />
          {search && (
            <Button
              text="Clear"
              variant="secondary"
              className="h-9"
              onClick={() => {
                setSearch("");
                setPage(1);
                setTimeout(fetchUsers, 0);
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
        ) : !data || data.users.length === 0 ? (
          <div className="flex h-60 items-center justify-center text-sm text-neutral-500">
            No users found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
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
                <tbody className="divide-y divide-neutral-200">
                  {data.users.map((user) => (
                    <tr key={user.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
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
                              <span className="text-neutral-400">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {user.workspace ? (
                              <PlanBadge plan={user.workspace.plan} />
                            ) : (
                              <span className="text-sm text-neutral-400">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge lockedAt={user.lockedAt} />
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-neutral-700">
                            {user.workspace ? (
                              <span className="tabular-nums">
                                {user.workspace.totalLinks}
                              </span>
                            ) : (
                              0
                            )}
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
