"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useDefaultDomains from "@/lib/swr/use-default-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { Logo, Switch } from "@dub/ui";
import { DUB_DOMAINS } from "@dub/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function DefaultDomains() {
  const { id, role } = useWorkspace();
  const [submitting, setSubmitting] = useState(false);
  const [defaultDomains, setDefaultDomains] = useState<string[]>([]);
  const { defaultDomains: initialDefaultDomains, mutate } = useDefaultDomains();

  const permissionsError = clientAccessCheck({
    action: "domains.write",
    role,
    customPermissionDescription: "manage default domains",
  }).error;

  useEffect(() => {
    if (initialDefaultDomains) {
      setDefaultDomains(initialDefaultDomains);
    }
  }, [initialDefaultDomains]);

  return (
    <div className="grid gap-5">
      <div className="rounded-lg bg-neutral-100 p-4">
        <p className="text-sm text-neutral-500">
          Leverage default branded domains from Ingat for specific links.{" "}
          <Link
            href="https://ingat.cc/help/article/default-domains"
            target="_blank"
            className="underline transition-colors hover:text-neutral-800"
          >
            Learn more.
          </Link>
        </p>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-3">
        {DUB_DOMAINS.map(({ slug, description }) => {
          return (
            <div
              key={slug}
              className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5"
            >
              <DomainCardTitleColumn
                domain={slug}
                icon={Logo}
                description={description}
                defaultDomain
              />
              <Switch
                disabled={submitting}
                disabledTooltip={permissionsError}
                checked={defaultDomains?.includes(slug)}
                fn={() => {
                  const oldDefaultDomains = defaultDomains.slice();
                  const newDefaultDomains = defaultDomains.includes(slug)
                    ? defaultDomains.filter((d) => d !== slug)
                    : [...defaultDomains, slug];

                  setDefaultDomains(newDefaultDomains);
                  setSubmitting(true);
                  fetch(`/api/domains/default?workspaceId=${id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      defaultDomains: newDefaultDomains.filter(
                        (d) => d !== null,
                      ),
                    }),
                  })
                    .then(async (res) => {
                      if (res.ok) {
                        toast.success(
                          `${slug} ${newDefaultDomains.includes(slug) ? "added to" : "removed from"} default domains.`,
                        );
                        await mutate();
                      } else {
                        const { error } = await res.json();
                        toast.error(error.message);
                        setDefaultDomains(oldDefaultDomains);
                      }
                    })
                    .finally(() => setSubmitting(false));
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
