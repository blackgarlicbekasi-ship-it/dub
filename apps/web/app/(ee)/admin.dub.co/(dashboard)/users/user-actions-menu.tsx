"use client";

import { Button, Input, LoadingSpinner, Popover } from "@dub/ui";
import { timeAgo } from "@dub/utils";
import { useCallback, useEffect, useRef, useState } from "react";
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
}

export function UserActionsMenu({
  user,
  onUpdate,
  onViewLinks,
}: {
  user: UserRow;
  onUpdate: () => void;
  onViewLinks: (user: UserRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<
    "password" | "plan" | "delete" | "workspace" | "links" | null
  >(null);

  const handleAction = async (action: string, body?: Record<string, string>) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        onUpdate();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("User deleted");
        onUpdate();
      } else {
        toast.error(data.error || "Delete failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <>
      <Popover
        content={
          <div className="w-48 p-1">
            <MenuButton
              label="View Links"
              onClick={() => {
                setOpen(false);
                setModal("links");
              }}
            />
            {user.workspace && (
              <MenuButton
                label="Workspace Info"
                onClick={() => {
                  setOpen(false);
                  setModal("workspace");
                }}
              />
            )}
            <MenuButton
              label="Change Password"
              onClick={() => {
                setOpen(false);
                setModal("password");
              }}
            />
            <MenuButton
              label="Change Plan"
              onClick={() => {
                setOpen(false);
                setModal("plan");
              }}
            />
            <MenuButton
              label="Toggle Telegram"
              onClick={() => {
                setOpen(false);
                handleAction("toggle_telegram");
              }}
            />
            {user.lockedAt ? (
              <MenuButton
                label="Unsuspend User"
                onClick={() => {
                  setOpen(false);
                  handleAction("unsuspend");
                }}
              />
            ) : (
              <MenuButton
                label="Suspend User"
                className="text-amber-600 hover:bg-amber-50"
                onClick={() => {
                  setOpen(false);
                  handleAction("suspend");
                }}
              />
            )}
            <div className="my-1 border-t border-neutral-200" />
            <MenuButton
              label="Delete User"
              className="text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false);
                setModal("delete");
              }}
            />
          </div>
        }
        openPopover={open}
        setOpenPopover={setOpen}
        align="end"
      >
        <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      </Popover>

      {modal === "password" && (
        <ChangePasswordModal user={user} onClose={() => setModal(null)}
          onSubmit={(password) => { setModal(null); handleAction("change_password", { password }); }} />
      )}
      {modal === "plan" && (
        <ChangePlanModal user={user} onClose={() => setModal(null)}
          onSubmit={(plan) => { setModal(null); handleAction("change_plan", { plan }); }} />
      )}
      {modal === "delete" && (
        <DeleteConfirmModal user={user} onClose={() => setModal(null)}
          onConfirm={() => { setModal(null); handleDelete(); }} />
      )}
      {modal === "workspace" && user.workspace && (
        <WorkspaceInfoModal user={user} onClose={() => setModal(null)} />
      )}
      {modal === "links" && (
        <ViewLinksModal user={user} onClose={() => setModal(null)} />
      )}
    </>
  );
}

function MenuButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick}
      className={`w-full rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 ${className || ""}`}>
      {label}
    </button>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      {children}
    </div>
  );
}

function ChangePasswordModal({ user, onClose, onSubmit }: { user: UserRow; onClose: () => void; onSubmit: (p: string) => void }) {
  const [password, setPassword] = useState("");
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold">Change Password</h3>
        <p className="mb-4 text-sm text-neutral-500">{user.email}</p>
        <form onSubmit={(e) => { e.preventDefault(); if (password.length >= 8) onSubmit(password); }}>
          <Input type="text" value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="New password (min 8 chars)" required minLength={8} />
          <div className="mt-4 flex gap-3">
            <Button text="Cancel" variant="secondary" onClick={onClose} type="button" className="flex-1" />
            <Button text="Update" type="submit" className="flex-1" />
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

function ChangePlanModal({ user, onClose, onSubmit }: { user: UserRow; onClose: () => void; onSubmit: (p: string) => void }) {
  const [plan, setPlan] = useState(user.workspace?.plan || "free");
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold">Change Plan</h3>
        <p className="mb-4 text-sm text-neutral-500">{user.email}</p>
        <select value={plan} onChange={(e) => setPlan(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <div className="mt-4 flex gap-3">
          <Button text="Cancel" variant="secondary" onClick={onClose} type="button" className="flex-1" />
          <Button text="Update Plan" onClick={() => onSubmit(plan)} className="flex-1" />
        </div>
      </div>
    </ModalOverlay>
  );
}

function DeleteConfirmModal({ user, onClose, onConfirm }: { user: UserRow; onClose: () => void; onConfirm: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-red-600">Delete User</h3>
        <p className="mb-2 text-sm text-neutral-500">
          This will permanently delete <strong>{user.email}</strong> and all their workspaces, links, and data.
        </p>
        <p className="mb-3 text-sm text-neutral-500">Type <strong>delete</strong> to confirm:</p>
        <Input type="text" value={confirmText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
          placeholder={'Type "delete"'} />
        <div className="mt-4 flex gap-3">
          <Button text="Cancel" variant="secondary" onClick={onClose} type="button" className="flex-1" />
          <Button text="Delete User" variant="danger" disabled={confirmText !== "delete"} onClick={onConfirm} className="flex-1" />
        </div>
      </div>
    </ModalOverlay>
  );
}

function WorkspaceInfoModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const ws = user.workspace!;
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Workspace Info</h3>
        <div className="space-y-3">
          <InfoRow label="Name" value={ws.name} />
          <InfoRow label="Slug" value={ws.slug} />
          <InfoRow label="Plan" value={ws.plan.charAt(0).toUpperCase() + ws.plan.slice(1)} />
          <InfoRow label="Total Links" value={String(ws.totalLinks)} />
          <InfoRow label="Total Clicks" value={String(ws.totalClicks)} />
          <InfoRow label="Owner" value={user.email} />
        </div>
        <div className="mt-5">
          <Button text="Close" variant="secondary" onClick={onClose} className="w-full" />
        </div>
      </div>
    </ModalOverlay>
  );
}

// ===== TASK 5: View Links Modal (replaces redirect to app.ingat.cc) =====
function ViewLinksModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/links?page=${page}&perPage=20`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch {
      toast.error("Failed to load links");
    } finally {
      setLoading(false);
    }
  }, [user.id, page]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleEditSave = async (linkId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, url: editUrl }),
      });
      if (res.ok) {
        toast.success("Link updated");
        setEditingLink(null);
        fetchLinks();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to update");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!window.confirm("Delete this link?")) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}/links`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
      if (res.ok) {
        toast.success("Link deleted");
        fetchLinks();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {user.name || user.email}
              </h3>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                {user.workspace && (
                  <>
                    <span>Workspace: <strong>{user.workspace.name}</strong></span>
                    <span>Slug: <strong>{user.workspace.slug}</strong></span>
                    <span>Plan: <strong>{user.workspace.plan}</strong></span>
                    <span>Links: <strong>{user.workspace.totalLinks}</strong></span>
                    <span>Created: <strong>{timeAgo(new Date(user.createdAt))}</strong></span>
                  </>
                )}
                {!user.workspace && <span>No workspace yet</span>}
              </div>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <LoadingSpinner className="h-6 w-6" />
            </div>
          ) : links.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
              No links found
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Short Link</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Destination</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Clicks</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5 text-sm font-medium text-neutral-900">
                      {link.shortLink}
                    </td>
                    <td className="max-w-[200px] px-4 py-2.5">
                      {editingLink === link.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="url"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            className="h-7 w-full rounded border border-neutral-300 px-2 text-xs"
                          />
                          <button onClick={() => handleEditSave(link.id)} className="text-xs font-medium text-blue-600 hover:underline">Save</button>
                          <button onClick={() => setEditingLink(null)} className="text-xs text-neutral-500 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <div className="truncate text-sm text-neutral-500" title={link.url}>{link.url}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-neutral-700">{link.clicks}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingLink !== link.id && (
                          <button onClick={() => { setEditingLink(link.id); setEditUrl(link.url); }}
                            className="text-xs text-blue-600 hover:underline">Edit</button>
                        )}
                        <button onClick={() => handleDeleteLink(link.id)}
                          className="text-xs text-red-600 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
            <span className="text-xs text-neutral-500">Page {page} of {totalPages} ({total} links)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="rounded border border-neutral-200 px-3 py-1 text-xs disabled:opacity-40 hover:bg-neutral-50">Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="rounded border border-neutral-200 px-3 py-1 text-xs disabled:opacity-40 hover:bg-neutral-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900">{value}</span>
    </div>
  );
}
