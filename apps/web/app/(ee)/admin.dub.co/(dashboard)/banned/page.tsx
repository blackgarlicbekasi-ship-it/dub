import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { BannedClient } from "./banned-client";

export const metadata = constructMetadata({
  title: "Banned Links - Ingat Admin",
  noIndex: true,
});

export default function BannedPage() {
  return (
    <Suspense>
      <BannedClient />
    </Suspense>
  );
}
