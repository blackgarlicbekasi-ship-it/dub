import { AuthLayout } from "@/ui/layout/auth-layout";
import { APP_DOMAIN, constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import { LoginPageClient } from "./page-client";

export const metadata = constructMetadata({
  title: "Sign in to Ingat",
  canonicalUrl: `${APP_DOMAIN}/login`,
});

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <h3 className="text-center text-xl font-semibold">
          Log in to your Ingat account
        </h3>
        <div className="mt-8">
          <Suspense>
            <LoginPageClient />
          </Suspense>
        </div>
      </div>
    </AuthLayout>
  );
}
