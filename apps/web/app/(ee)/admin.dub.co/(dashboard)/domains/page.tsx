import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { DomainsClient } from "./domains-client";

export const metadata = constructMetadata({
  title: "Domains - Ingat Admin",
  noIndex: true,
});

export default function DomainsPage() {
  return (
    <Suspense>
      <DomainsClient />
    </Suspense>
  );
}
