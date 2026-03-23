import LoginForm from "@/ui/auth/login/login-form";
import { Background } from "@dub/ui";
import { constructMetadata } from "@dub/utils";
import { Suspense } from "react";

export const metadata = constructMetadata({
  title: "Ingat Panel",
  noIndex: true,
});

export default function PanelLoginPage() {
  return (
    <>
      <Background />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
        <div className="w-full max-w-sm px-4">
          <h3 className="text-center text-xl font-semibold">Ingat Panel</h3>
          <p className="mt-2 text-center text-sm text-neutral-500">
            Bulk URL replacement tool
          </p>
          <div className="mt-8">
            <Suspense>
              <LoginForm methods={["email", "password"]} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
