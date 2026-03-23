import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { HistoryClient } from "./history-client";

export const metadata = constructMetadata({
  title: "History - Ingat Panel",
  noIndex: true,
});

export default function HistoryPage() {
  return (
    <Suspense>
      <HistoryClient />
    </Suspense>
  );
}
