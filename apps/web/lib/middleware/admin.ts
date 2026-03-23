import { prismaEdge } from "@dub/prisma/edge";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import { getUserViaToken } from "./utils/get-user-via-token";
import { parse } from "./utils/parse";

const ADMIN_EMAIL = "angelkongkonngaji@gmail.com";

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

  // Logged in — check if email matches admin
  if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
    // Non-admin user: redirect to login with error
    const response = NextResponse.redirect(new URL("/login?error=access-denied", req.url));
    // Clear the session cookie so they can"t keep hitting this
    response.cookies.delete("__Secure-next-auth.session-token");
    response.cookies.delete("next-auth.session-token");
    return response;
  }

  // Admin user — verify workspace membership
  const isAdminUser = await prismaEdge.projectUsers.findUnique({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId: DUB_WORKSPACE_ID,
      },
    },
  });

  if (!isAdminUser) {
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
