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
  const [previewPage, setPreviewPage] = useState(1);
  const previewPerPage = 10;

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
        setPreviewPage(1);
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
    <div className="mx-auto w-full max-w-screen-lg px-3 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">Bulk URL Replace</h1>
        <p className="mt-1 text-sm text-neutral-500">Find and replace domains in your shortlink destinations</p>
      </div>

      {isAdmin && (
        <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
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

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
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
          <Button text="Preview" onClick={handlePreview} loading={loading} variant="secondary" className="h-9 w-auto rounded-lg px-4" />
          {preview && previewTotal > 0 && (
            <Button
              text={`Execute Replace (${previewTotal} links)`}
              onClick={() => setShowConfirm(true)}
              loading={executing}
              className="h-9 w-auto rounded-lg px-4"
            />
          )}
        </div>
      </div>

      {preview && previewTotal > 0 && (() => {
        const totalPreviewPages = Math.ceil(preview.length / previewPerPage);
        const startIdx = (previewPage - 1) * previewPerPage;
        const endIdx = Math.min(startIdx + previewPerPage, preview.length);
        const pageLinks = preview.slice(startIdx, endIdx);

        return (
          <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <span className="text-sm font-medium text-neutral-700">
                Showing {startIdx + 1}-{endIdx} of {previewTotal} shortlinks
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
                  {pageLinks.map((link) => (
                    <tr key={link.id} className="transition-colors hover:bg-neutral-50/60">
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-neutral-900">{link.shortLink}</td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-sm text-neutral-500">{link.currentUrl}</td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-sm text-emerald-700">{link.newUrl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPreviewPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
                <p className="text-sm text-neutral-500">
                  Page {previewPage} of {totalPreviewPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={previewPage <= 1}
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={previewPage >= totalPreviewPages}
                    onClick={() => setPreviewPage((p) => p + 1)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {preview && previewTotal === 0 && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 shadow-sm">
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
              <Button text="Cancel" variant="secondary" onClick={() => setShowConfirm(false)} className="h-9 w-auto rounded-lg px-4" />
              <Button text="Confirm Replace" onClick={handleExecute} loading={executing} className="h-9 w-auto rounded-lg px-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
