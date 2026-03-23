"use client";

import { LoadingSpinner } from "@dub/ui";
import { useEffect, useState } from "react";

interface DomainInfo {
  slug: string;
  verified: boolean;
  primary: boolean;
  target: string | null;
  type: string;
}

export function DomainsClient() {
  const [domains, setDomains] = useState<DomainInfo[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/domains")
      .then((r) => r.json())
      .then((data) => setDomains(data.domains || []))
      .catch(() => setDomains([]));
  }, []);

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Domains</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Default domains for shortlink creation
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {domains === null ? (
          <div className="flex h-40 items-center justify-center">
            <LoadingSpinner className="h-6 w-6" />
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
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Target
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {domains.map((d) => (
                <tr key={d.slug} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                    {d.slug}
                    {d.primary && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Primary
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{d.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.verified
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {d.verified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {d.target || "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
