"use client";

import { Button, Input, LoadingSpinner } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

interface PreviewLink {
  id: string;
  shortLink: string;
  currentUrl: string;
  newUrl: string;
}

interface PreviewResponse {
  links: PreviewLink[];
  total: number;
}

export function ReplaceClient() {
  const { data: session } = useSession();
  const [oldDomain, setOldDomain] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  const handlePreview = async () => {
    if (!oldDomain || !newDomain) {
      toast.error("Please enter both old and new URL/domain");
      return;
    }
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/panel/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldDomain, newDomain, preview: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
        if (data.total === 0) {
          toast.info("No matching links found");
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Preview failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!window.confirm(`Replace ${preview?.total} links? This cannot be easily undone.`)) return;
    setExecuting(true);
    try {
      const res = await fetch("/api/panel/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldDomain, newDomain, preview: false }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.updated} links updated successfully`);
        setPreview(null);
        setOldDomain("");
        setNewDomain("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Replace failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Bulk URL Replace</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Find and replace domains in your shortlink destinations
      </p>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Old URL / Domain
            </label>
            <Input
              type="text"
              placeholder="tokopedia.com"
              value={oldDomain}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldDomain(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              New URL / Domain
            </label>
            <Input
              type="text"
              placeholder="shopee.co.id"
              value={newDomain}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDomain(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            text="Preview"
            onClick={handlePreview}
            loading={loading}
            variant="secondary"
            className="h-9"
          />
          {preview && preview.total > 0 && (
            <Button
              text={`Execute Replace (${preview.total} links)`}
              onClick={handleExecute}
              loading={executing}
              className="h-9"
            />
          )}
        </div>
      </div>

      {preview && preview.links.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <span className="text-sm font-medium text-neutral-700">
              {preview.total} shortlink{preview.total !== 1 ? "s" : ""} will be updated
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Short Link
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Current URL
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    New URL
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {preview.links.map((link) => (
                  <tr key={link.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-neutral-900">
                      {link.shortLink}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2 text-sm text-neutral-500">
                      {link.currentUrl}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2 text-sm text-green-700">
                      {link.newUrl}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
