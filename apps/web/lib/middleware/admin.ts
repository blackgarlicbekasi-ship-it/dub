import { NextRequest, NextResponse } from "next/server";
import { isAdminUserId } from "../auth/admin-ids";
import { clearSessionCookie } from "../auth/session-cookie";
import { getUserViaToken } from "./utils/get-user-via-token";
import { parse } from "./utils/parse";

export async function AdminMiddleware(req: NextRequest) {
  const { path } = parse(req);

  const user = await getUserViaToken(req);

  // Not logged in — allow login page, redirect everything else to login
  if (!user) {
    if (path === "/login") {
      return NextResponse.rewrite(
        new URL(`/admin.dub.co${path}`, req.url),
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!isAdminUserId(user.id)) {
    return clearSessionCookie(
      NextResponse.redirect(new URL("/login?error=access-denied", req.url)),
    );
  }

  // Redirect login/workspaces to dashboard
  if (path === "/login" || path === "/workspaces") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.rewrite(
    new URL(`/admin.dub.co${path === "/" ? "" : path}`, req.url),
  );
}
