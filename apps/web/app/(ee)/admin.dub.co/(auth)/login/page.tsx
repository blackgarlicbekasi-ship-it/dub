import LoginForm from "@/ui/auth/login/login-form";
import { Background } from "@dub/ui";
import { constructMetadata } from "@dub/utils";

export const metadata = constructMetadata({
  title: "Admin Login - Ingat",
  noIndex: true,
});

export default function AdminLoginPage() {
  return (
    <>
      <Background />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
        <div className="w-full max-w-sm px-4">
          <h3 className="text-center text-xl font-semibold">
            Ingat Admin
          </h3>
          <div className="mt-8">
            <LoginForm methods={["email", "password"]} />
          </div>
        </div>
      </div>
    </>
  );
}
