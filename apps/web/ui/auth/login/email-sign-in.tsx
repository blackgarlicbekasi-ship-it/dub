import { checkAccountExistsAction } from "@/lib/actions/check-account-exists";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { signIn } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { errorCodes, LoginFormContext } from "./login-form";

export const EmailSignIn = ({ next }: { next?: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const finalNext = next ?? searchParams?.get("next");
  const { isMobile } = useMediaQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const {
    setClickedMethod,
    authMethod,
    setAuthMethod,
    clickedMethod,
    setLastUsedAuthMethod,
    setShowSSOOption,
  } = useContext(LoginFormContext);

  const { executeAsync, isPending } = useAction(checkAccountExistsAction, {
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          if (!email || !password) {
            toast.error("Please enter your email and password.");
            return;
          }

          setClickedMethod("email");

          const result = await executeAsync({ email });

          if (!result?.data) {
            setClickedMethod(undefined);
            return;
          }

          const { accountExists, hasPassword, isSuspended } = result.data;

          if (!accountExists) {
            setClickedMethod(undefined);
            toast.error("No account found with that email address.");
            return;
          }

          if (isSuspended) {
            setClickedMethod(undefined);
            toast.error(
              "Your account has been suspended. Contact administrator.",
            );
            return;
          }

          if (!hasPassword) {
            setClickedMethod(undefined);
            toast.error(
              "This account does not have a password set. Contact administrator.",
            );
            return;
          }

          const response = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl: finalNext || "/workspaces",
          });

          if (!response) {
            setClickedMethod(undefined);
            return;
          }

          if (!response.ok && response.error) {
            if (errorCodes[response.error]) {
              toast.error(errorCodes[response.error]);
            } else {
              toast.error(response.error);
            }

            setClickedMethod(undefined);
            return;
          }

          setLastUsedAuthMethod("email");
          router.push(response?.url || finalNext || "/workspaces");
        }}
        className="flex flex-col gap-y-6"
      >
        {authMethod === "email" && (
          <>
            <label>
              <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
                Email
              </span>
              <input
                id="email"
                name="email"
                autoFocus={!isMobile}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size={1}
                className={cn(
                  "block w-full min-w-0 appearance-none rounded-md border border-neutral-300 px-3 py-2 placeholder-neutral-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm",
                  {
                    "pr-10": isPending,
                  },
                )}
              />
            </label>

            <label>
              <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
                Password
              </span>
              <Input
                type="password"
                value={password}
                placeholder="Enter your password"
                required
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </>
        )}

        <Button
          text="Log in"
          {...(authMethod !== "email" && {
            type: "button",
            onClick: (e) => {
              e.preventDefault();
              setShowSSOOption(false);
              setAuthMethod("email");
            },
          })}
          loading={clickedMethod === "email" || isPending}
          disabled={clickedMethod && clickedMethod !== "email"}
        />
      </form>
    </>
  );
};
