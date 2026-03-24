"use client";

import Analytics from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function AnalyticsWithLinkId({
  linkId,
  linkKey,
  domain,
}: {
  linkId: string;
  linkKey: string;
  domain: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Set linkId in the URL search params so the Analytics component picks it up
  useEffect(() => {
    if (!searchParams.has("linkId")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("linkId", linkId);
      router.replace(`/analytics/${encodeURIComponent(linkKey)}?${params.toString()}`);
    }
  }, [linkId, linkKey, searchParams, router]);

  // Don't render analytics until linkId is in the URL
  if (!searchParams.has("linkId")) {
    return <LayoutLoader />;
  }

  return (
    <div className="w-full">
      <div className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6">
        <p className="mb-4 text-sm text-neutral-500">
          Analytics for{" "}
          <span className="font-medium text-neutral-900">
            {domain}/{linkKey}
          </span>
        </p>
      </div>
      <Analytics adminPage />
    </div>
  );
}

export function AdminLinkAnalytics({
  linkId,
  linkKey,
  domain,
}: {
  linkId: string;
  linkKey: string;
  domain: string;
}) {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsWithLinkId linkId={linkId} linkKey={linkKey} domain={domain} />
    </Suspense>
  );
}
