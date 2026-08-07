import { NextRequest, NextResponse } from "next/server";
import { isAdminUserId } from "../auth/admin-ids";
import { isUserSuspended, signOutSuspendedUser } from "../auth/suspended";
import { getUserViaToken } from "./utils/get-user-via-token";
import { parse } from "./utils/parse";

export async function AdminMiddleware(req: NextRequest) {
  const { path } = parse(req);

  const user = await getUserViaToken(req);

  if (user?.id && (await isUserSuspended(user.id))) {
    return signOutSuspendedUser(req);
  }

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
    const response = NextResponse.redirect(new URL("/login?error=access-denied", req.url));
    response.cookies.delete("__Secure-next-auth.session-token");
    response.cookies.delete("next-auth.session-token");
    return response;
  }

  // Redirect login/workspaces to dashboard
  if (path === "/login" || path === "/workspaces") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.rewrite(
    new URL(`/admin.dub.co${path === "/" ? "" : path}`, req.url),
  );
}
