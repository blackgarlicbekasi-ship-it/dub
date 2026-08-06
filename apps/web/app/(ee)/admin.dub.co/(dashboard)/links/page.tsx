import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { AdminLinksClient } from "./links-client";

export const metadata = constructMetadata({
  title: "Links - Ingat Admin",
  noIndex: true,
});

export default function AdminLinks() {
  return (
    <Suspense>
      <AdminLinksClient />
    </Suspense>
  );
}
