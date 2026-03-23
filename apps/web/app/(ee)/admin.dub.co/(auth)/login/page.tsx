import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { AdminLoginClient } from "./admin-login-client";

export const metadata = constructMetadata({
  title: "Ingat Admin",
  noIndex: true,
});

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginClient />
    </Suspense>
  );
}
