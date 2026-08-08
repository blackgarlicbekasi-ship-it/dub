import { NextRequest, NextResponse } from "next/server";
import {
  ONBOARDING_WINDOW_SECONDS,
  onboardingStepCache,
} from "../api/workspaces/onboarding-step-cache";
import { EmbedMiddleware } from "./embed";
import { NewLinkMiddleware } from "./new-link";
import { appRedirect } from "./utils/app-redirect";
import { getDefaultWorkspace } from "./utils/get-default-workspace";
import { getUserViaToken } from "./utils/get-user-via-token";
import { hasPendingInvites } from "./utils/has-pending-invites";
import { isTopLevelSettingsRedirect } from "./utils/is-top-level-settings-redirect";
import { parse } from "./utils/parse";
import { WorkspacesMiddleware } from "./workspaces";

export async function AppMiddleware(req: NextRequest) {
  const { path, fullPath, searchParamsString } = parse(req);

  if (path.startsWith("/embed")) {
    return EmbedMiddleware(req);
  }

  const user = await getUserViaToken(req);

  // if there's no user and the path isn't /login or /register, redirect to /login
  if (
    !user &&
    path !== "/login" &&
    path !== "/forgot-password" &&
    path !== "/register" &&
    path !== "/auth/saml" &&
    !path.startsWith("/auth/reset-password/") &&
    !path.startsWith("/share/") &&
    !path.startsWith("/deeplink/")
  ) {
    return NextResponse.redirect(
      new URL(
        `/login${path === "/" ? "" : `?next=${encodeURIComponent(fullPath)}`}`,
        req.url,
      ),
    );

    // if there's a user
  } else if (user) {
    // /new is a special path that creates a new link (or workspace if the user doesn't have one yet)
    if (path === "/new") {
      return NewLinkMiddleware(req, user);

      /* Onboarding redirects

        - User was created less than a day ago
        - User is not invited to a workspace (redirect straight to the workspace)
        - The path does not start with /onboarding
        - User doesn't have a default workspace
        - User has not completed the onboarding flow
      */
    } else if (
      new Date(user.createdAt).getTime() >
        Date.now() - ONBOARDING_WINDOW_SECONDS * 1000 &&
      !["/onboarding", "/account"].some((p) => path.startsWith(p))
    ) {
      // Parallelize independent checks instead of running them sequentially
      const [defaultWorkspace, pendingInvites, onboardingStep] =
        await Promise.all([
          getDefaultWorkspace(user),
          hasPendingInvites({ req, user }),
          onboardingStepCache.get({ userId: user.id }),
        ]);

      if (!defaultWorkspace && !pendingInvites && onboardingStep !== "completed") {
        if (!onboardingStep) {
          return NextResponse.redirect(new URL("/onboarding", req.url));
        } else if (onboardingStep === "completed") {
          return WorkspacesMiddleware(req, user);
        }

        if (defaultWorkspace) {
          const step = onboardingStep === "workspace" ? "link" : onboardingStep;
          return NextResponse.redirect(
            new URL(`/onboarding/${step}?workspace=${defaultWorkspace}`, req.url),
          );
        } else {
          return NextResponse.redirect(new URL("/onboarding", req.url));
        }
      }
      // Fall through if user has workspace, pending invites, or completed onboarding
    }

    if (
      [
        "/",
        "/login",
        "/register",
        "/workspaces",
        "/links",
        "/analytics",
        "/events",
        "/customers",
        "/program",
        "/programs",
        "/settings",
        "/upgrade",
        "/guides",
        "/wrapped",
      ].includes(path) ||
      path.startsWith("/program/") ||
      path.startsWith("/settings/") ||
      isTopLevelSettingsRedirect(path)
    ) {
      return WorkspacesMiddleware(req, user);
    }

    const appRedirectPath = await appRedirect(path);
    if (appRedirectPath) {
      return NextResponse.redirect(
        new URL(`${appRedirectPath}${searchParamsString}`, req.url),
      );
    }
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url));
}
