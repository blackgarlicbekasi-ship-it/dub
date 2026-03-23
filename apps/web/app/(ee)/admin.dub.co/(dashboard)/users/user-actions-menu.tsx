"use client";

import { Button, Input, Popover } from "@dub/ui";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserRow } from "./page-client";

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
    "password" | "plan" | "delete" | "workspace" | null
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
            {user.workspace && (
              <MenuButton
                label="View Links"
                onClick={() => {
                  setOpen(false);
                  onViewLinks(user);
                }}
              />
            )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900">{value}</span>
    </div>
  );
}
