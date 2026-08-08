"use client";

import usePlatformDomains from "@/lib/swr/use-platform-domains";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { Logo, Switch } from "@dub/ui";
import { useState } from "react";
import { toast } from "sonner";

export function PlatformDomains() {
  const { platformDomains, loading, mutate } = usePlatformDomains();
  const [pending, setPending] = useState<string | null>(null);

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

  if (loading || platformDomains.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 grid grid-cols-1 gap-3">
      {platformDomains.map(({ slug, description, alwaysOn, enabled }) => (
        <div
          key={slug}
          className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5"
        >
          <DomainCardTitleColumn
            domain={slug}
            icon={Logo}
            description={
              alwaysOn
                ? "Available to everyone by default"
                : description || "Shared domain"
            }
            defaultDomain
          />
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
        </div>
      ))}
    </div>
  );
}
