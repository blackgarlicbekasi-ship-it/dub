"use client";

import { Turnstile, TurnstileHandle } from "@/ui/auth/turnstile";
import { Button, Input } from "@dub/ui";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);

  useEffect(() => {
    const error = searchParams?.get("error");
    if (error === "access-denied") {
      toast.error("Access denied. Admin login is restricted.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await signIn("credentials", {
        email,
        password,
        turnstileToken,
        redirect: false,
        callbackUrl: "/",
      });

      if (!response) {
        turnstileRef.current?.reset();
        setLoading(false);
        return;
      }

      if (!response.ok && response.error) {
        const errorMessages: Record<string, string> = {
          "no-credentials": "Please provide an email and password.",
          "invalid-credentials": "Email or password is incorrect.",
          "exceeded-login-attempts": "Account locked. Too many attempts.",
          "too-many-login-attempts": "Too many attempts. Try again later.",
          "account-suspended": "Account suspended. Contact administrator.",
          "invalid-captcha":
            "Could not verify that you are human. Please try again.",
        };
        toast.error(errorMessages[response.error] || response.error);
        turnstileRef.current?.reset();
        setLoading(false);
        return;
      }

      router.push("/");
    } catch {
      toast.error("An error occurred. Please try again.");
      turnstileRef.current?.reset();
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-y-5">
        <label>
          <span className="mb-2 block text-sm font-medium text-neutral-700">
            Email
          </span>
          <Input
            type="email"
            autoFocus
            placeholder="admin@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            className="max-w-none"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-neutral-700">
            Password
          </span>
          <Input
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            className="max-w-none"
          />
        </label>

        <Turnstile ref={turnstileRef} onToken={setTurnstileToken} />

        <Button type="submit" text="Log in" loading={loading} />
      </form>
    </div>
  );
}
