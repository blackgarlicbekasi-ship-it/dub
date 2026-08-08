"use client";

import useDomains from "@/lib/swr/use-domains";
import usePlatformDomains from "@/lib/swr/use-platform-domains";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { Logo, Switch } from "@dub/ui";
import { DUB_DOMAINS_ARRAY } from "@dub/utils";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function PlatformDomains() {
  const { platformDomains, loading, mutate } = usePlatformDomains();
  const { allWorkspaceDomains } = useDomains();
  const [pending, setPending] = useState<string | null>(null);

  const workspaceOwned = useMemo(
    () => new Set((allWorkspaceDomains ?? []).map((d) => d.slug)),
    [allWorkspaceDomains],
  );

  const visibleDomains = useMemo(
    () => platformDomains.filter((d) => !DUB_DOMAINS_ARRAY.includes(d.slug)),
    [platformDomains],
  );

  const toggle = async (slug: string, enabled: boolean) => {
    if (!enabled) {
      const confirmed = window.confirm(
        `Turn off ${slug}? It will be removed from your domain dropdown. Links you already created on ${slug} keep working.`,
      );
      if (!confirmed) return;
    }

    setPending(slug);
    try {
      const res = await fetch("/api/domains/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: slug, enabled }),
      });

      if (res.ok) {
        toast.success(enabled ? `${slug} turned on` : `${slug} turned off`);
        await mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || "Could not update domain");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPending(null);
    }
  };

  if (loading || visibleDomains.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 grid grid-cols-1 gap-3">
      {visibleDomains.map(({ slug, description, alwaysOn, enabled }) => {
        const owned = workspaceOwned.has(slug);

        return (
          <div
            key={slug}
            className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5"
          >
            <DomainCardTitleColumn
              domain={slug}
              icon={Logo}
              description={
                owned
                  ? "Owned by your workspace, always available to you"
                  : alwaysOn
                    ? "Available to everyone by default"
                    : description || "Shared domain"
              }
              defaultDomain
            />
            {!owned && (
              <Switch
                disabled={alwaysOn || pending === slug}
                disabledTooltip={
                  alwaysOn
                    ? "This domain is always available and cannot be turned off."
                    : undefined
                }
                checked={enabled}
                fn={() => toggle(slug, !enabled)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
