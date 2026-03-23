import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { ReplaceClient } from "./replace-client";

export const metadata = constructMetadata({
  title: "Bulk Replace - Ingat Panel",
  noIndex: true,
});

export default function PanelDashboardPage() {
  return (
    <Suspense>
      <ReplaceClient />
    </Suspense>
  );
}
