"use client";

import { Button, Input, LoadingSpinner } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PreviewLink {
  id: string;
  shortLink: string;
  currentUrl: string;
  newUrl: string;
}

interface UserOption {
  id: string;
  email: string;
  linkCount: number;
}

type ReplaceMode = "my" | "selected" | "all";

export function ReplaceClient() {
  const { data: session } = useSession();
  const [oldDomain, setOldDomain] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [preview, setPreview] = useState<PreviewLink[] | null>(null);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mode, setMode] = useState<ReplaceMode>("my");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/panel/role").then((r) => r.json()).then((d) => {
      setIsAdmin(d.isAdmin === true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAdmin && mode === "selected") {
      fetch("/api/panel/users").then((r) => r.json()).then((d) => {
        setUsers(d.users || []);
      }).catch(() => {});
    }
  }, [isAdmin, mode]);

  const validate = useCallback(() => {
    const o = oldDomain.trim();
    const n = newDomain.trim();
    if (!o || o.length < 3) { toast.error("Old URL/Domain must be at least 3 characters"); return false; }
    if (!n || n.length < 3) { toast.error("New URL/Domain must be at least 3 characters"); return false; }
    if (o === n) { toast.error("Old and new domain cannot be the same"); return false; }
    if (/^[.\-_!@#$%^&*()]+$/.test(n)) { toast.error("New domain contains only special characters"); return false; }
    return true;
  }, [oldDomain, newDomain]);

  const handlePreview = async () => {
    if (!validate()) return;
    setLoading(true);
    setPreview(null);
    setPreviewTotal(0);
    try {
      const body: Record<string, unknown> = {
        oldDomain: oldDomain.trim(),
        newDomain: newDomain.trim(),
        preview: true,
        mode: isAdmin ? mode : "my",
      };
      if (mode === "selected") body.selectedUserIds = selectedUserIds;

      const res = await fetch("/api/panel/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data.links);
        setPreviewTotal(data.total);
        if (data.total === 0) toast.info("No matching links found");
      } else {
        const err = await res.json();
        toast.error(err.error || "Preview failed");
      }
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  const handleExecute = async () => {
    setShowConfirm(false);
    setExecuting(true);
    try {
      const body: Record<string, unknown> = {
        oldDomain: oldDomain.trim(),
        newDomain: newDomain.trim(),
        preview: false,
        mode: isAdmin ? mode : "my",
      };
      if (mode === "selected") body.selectedUserIds = selectedUserIds;

      const res = await fetch("/api/panel/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.updated} links updated successfully`);
        setPreview(null);
        setPreviewTotal(0);
        setOldDomain("");
        setNewDomain("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Replace failed");
      }
    } catch { toast.error("Network error"); }
    finally { setExecuting(false); }
  };

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">Bulk URL Replace</h1>
        <p className="mt-1 text-sm text-neutral-500">Find and replace domains in your shortlink destinations</p>
      </div>

      {isAdmin && (
        <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-500">Scope</label>
          <div className="flex gap-2">
            {(["my", "selected", "all"] as ReplaceMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setPreview(null); }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {m === "my" ? "My Links" : m === "selected" ? "Selected Users" : "All Users"}
              </button>
            ))}
          </div>

          {mode === "selected" && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-2">
              {users.length === 0 ? (
                <div className="flex h-16 items-center justify-center text-xs text-neutral-400">Loading users...</div>
              ) : users.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={(e) => {
                      setSelectedUserIds(e.target.checked
                        ? [...selectedUserIds, u.id]
                        : selectedUserIds.filter((id) => id !== u.id)
                      );
                    }}
                    className="rounded border-neutral-300"
                  />
                  <span className="text-neutral-700">{u.email}</span>
                  <span className="ml-auto text-xs text-neutral-400">{u.linkCount} links</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Old URL / Domain</label>
            <Input
              type="text"
              placeholder="tokopedia.com"
              value={oldDomain}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setOldDomain(e.target.value); setPreview(null); }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">New URL / Domain</label>
            <Input
              type="text"
              placeholder="shopee.co.id"
              value={newDomain}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setNewDomain(e.target.value); setPreview(null); }}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button text="Preview" onClick={handlePreview} loading={loading} variant="secondary" className="h-9" />
          {preview && previewTotal > 0 && (
            <Button
              text={`Execute Replace (${previewTotal} links)`}
              onClick={() => setShowConfirm(true)}
              loading={executing}
              className="h-9"
            />
          )}
        </div>
      </div>

      {preview && previewTotal > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <span className="text-sm font-medium text-neutral-700">
              {previewTotal} shortlink{previewTotal !== 1 ? "s" : ""} will be updated
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Short Link</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Current URL</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">New URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {preview.slice(0, 100).map((link) => (
                  <tr key={link.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-neutral-900">{link.shortLink}</td>
                    <td className="max-w-[200px] truncate px-4 py-2 text-sm text-neutral-500">{link.currentUrl}</td>
                    <td className="max-w-[200px] truncate px-4 py-2 text-sm text-emerald-700">{link.newUrl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewTotal > 100 && (
            <div className="border-t border-neutral-100 px-4 py-2 text-center text-xs text-neutral-400">
              Showing 100 of {previewTotal} links
            </div>
          )}
        </div>
      )}

      {preview && previewTotal === 0 && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          No matching links found
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowConfirm(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-900">Confirm Replace</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Are you sure you want to update <strong>{previewTotal}</strong> links?
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              This will change <strong>{oldDomain.trim()}</strong> to <strong>{newDomain.trim()}</strong>
            </p>
            <div className="mt-5 flex gap-3">
              <Button text="Cancel" variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1 h-9" />
              <Button text="Confirm Replace" onClick={handleExecute} loading={executing} className="flex-1 h-9" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
