import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { UsersPageClient } from "./page-client";

export const metadata = constructMetadata({
  title: "User Management - Ingat Admin",
  noIndex: true,
});

export default function UsersPage() {
  return (
    <Suspense>
      <UsersPageClient />
    </Suspense>
  );
}
