"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { TabSelect } from "@dub/ui";
import { useSelectedLayoutSegment } from "next/navigation";

export function DomainsHeader({
  baseUrl = "/settings/domains",
}: {
  baseUrl?: `/${string}`;
}) {
  const { slug, plan, defaultProgramId } = useWorkspace();
  const { canSendEmailCampaigns } = getPlanCapabilities(plan);
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  return (
    <div className="-mt-4 border-b border-neutral-200">
      <TabSelect
        options={[
          {
            id: "",
            label: "Custom domains",
            href: `/${slug}${baseUrl}`,
          },
          {
            id: "default",
            label: "Default domains",
            href: `/${slug}${baseUrl}/default`,
          },
          ...(canSendEmailCampaigns && defaultProgramId
            ? [
                {
                  id: "email",
                  label: "Email domains",
                  href: `/${slug}${baseUrl}/email`,
                },
              ]
            : []),
        ]}
        selected={page}
      />
    </div>
  );
}
