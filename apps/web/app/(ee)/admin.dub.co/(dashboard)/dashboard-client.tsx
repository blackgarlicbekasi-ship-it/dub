"use client";

import { Button, Input, LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AdminStats {
  totalUsers: number;
  totalLinks: number;
  totalClicks: number;
  totalWorkspaces: number;
}

export function AdminDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto w-full max-w-screen-lg px-3 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">Ingat admin overview</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Users" value={stats?.totalUsers} />
        <StatCard label="Links" value={stats?.totalLinks} />
        <StatCard label="Clicks" value={stats?.totalClicks} />
        <StatCard label="Workspaces" value={stats?.totalWorkspaces} />
      </div>

      <div className="mt-8 flex flex-col divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <BanLinkSection />
        <RefreshDomainSection />
        <ResetLoginSection />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
        {value !== undefined ? value.toLocaleString() : "\u2014"}
      </div>
    </div>
  );
}

function BanLinkSection() {
  const [pending, setPending] = useState(false);

  return (
    <div className="p-5">
      <h3 className="text-sm font-semibold text-neutral-900">Ban Link</h3>
      <p className="mt-1 text-xs text-neutral-500">Ban a short link by key</p>
      <form
        className="mt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const key = new FormData(form).get("key") as string;
          if (!key) return;
          if (!window.confirm("Ban this link?")) return;
          setPending(true);
          try {
            const res = await fetch(
              `/api/admin/links/ban?domain=ingat.cc&key=${encodeURIComponent(key)}`,
              { method: "DELETE" },
            ).then((r) => r.json());
            if (res.error) toast.error(res.error);
            else { toast.success("Link banned"); form.reset(); }
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="relative flex w-full rounded-md shadow-sm">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-4 text-sm text-neutral-500">
            ingat.cc/
          </span>
          <input
            name="key"
            type="text"
            required
            disabled={pending}
            autoComplete="off"
            placeholder="slug"
            className={cn(
              "block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
              pending && "bg-neutral-100",
            )}
            onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text/plain");
              e.currentTarget.value = text.replace(/^https?:\/\/ingat\.cc\//, "").replace(/^ingat\.cc\//, "");
            }}
          />
          {pending && <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />}
        </div>
      </form>
    </div>
  );
}

function RefreshDomainSection() {
  const [pending, setPending] = useState(false);

  return (
    <div className="p-5">
      <h3 className="text-sm font-semibold text-neutral-900">Refresh Domain</h3>
      <p className="mt-1 text-xs text-neutral-500">Remove and re-add domain from Vercel</p>
      <form
        className="mt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const domain = new FormData(form).get("domain") as string;
          if (!domain) return;
          const confirmed = window.confirm(
            `Remove ${domain} from the Vercel project and re-add it?\n\n` +
              `While it is removed, every shortlink on ${domain} stops resolving. ` +
              `If the re-add fails, ${domain} stays offline until it is added back manually.`,
          );
          if (!confirmed) return;
          setPending(true);
          try {
            const res = await fetch("/api/admin/refresh-domain", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ domain }),
            }).then((r) => r.json());
            if (res.error) toast.error(res.error);
            else { toast.success(`${domain} refreshed`); form.reset(); }
          } catch {
            toast.error("Network error. The domain may be in an unknown state.");
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="relative flex w-full rounded-md shadow-sm">
          <input
            name="domain"
            type="text"
            required
            disabled={pending}
            autoComplete="off"
            placeholder="ingat.cc"
            className={cn(
              "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
              pending && "bg-neutral-100",
            )}
          />
          {pending && <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />}
        </div>
      </form>
    </div>
  );
}

function ResetLoginSection() {
  const [pending, setPending] = useState(false);

  return (
    <div className="p-5">
      <h3 className="text-sm font-semibold text-neutral-900">Reset Login Attempts</h3>
      <p className="mt-1 text-xs text-neutral-500">Reset invalidLoginAttempts and unlock user</p>
      <form
        className="mt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const email = new FormData(form).get("email") as string;
          if (!email) return;
          setPending(true);
          try {
            const res = await fetch("/api/admin/reset-login-attempts", {
              method: "POST",
              body: JSON.stringify({ email }),
            }).then((r) => r.json());
            if (res.error) toast.error(res.error);
            else { toast.success("Login attempts reset"); form.reset(); }
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="relative flex w-full rounded-md shadow-sm">
          <input
            name="email"
            type="email"
            required
            disabled={pending}
            autoComplete="off"
            placeholder="user@example.com"
            className={cn(
              "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
              pending && "bg-neutral-100",
            )}
          />
          {pending && <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />}
        </div>
      </form>
    </div>
  );
}
