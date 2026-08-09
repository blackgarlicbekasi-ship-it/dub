import { Background } from "@dub/ui";
import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { AdminLoginClient } from "./admin-login-client";

export const metadata = constructMetadata({
  title: "Ingat Admin",
  noIndex: true,
});

export default function AdminLoginPage() {
  return (
    <>
      <Background />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
        <div className="w-full max-w-sm px-4">
          <h3 className="text-center text-xl font-semibold">Ingat Admin</h3>
          <p className="mt-2 text-center text-sm text-neutral-500">
            Restricted access
          </p>
          <div className="mt-8">
            <Suspense>
              <AdminLoginClient />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
