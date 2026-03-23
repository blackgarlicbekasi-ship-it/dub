"use client";

import LoginForm from "@/ui/auth/login/login-form";

export function LoginPageClient() {
  return <LoginForm methods={["email", "password"]} />;
}
