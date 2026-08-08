import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export const PanelMiddleware = async (req: NextRequest) => {
  const path = req.nextUrl.pathname;

  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!session?.email && path !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session?.email && path === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Redirect /workspaces to / — panel has no workspaces page
  if (path === "/workspaces" || path.startsWith("/workspaces/")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.rewrite(
    new URL(`/panel.ingat.cc${path === "/" ? "" : path}`, req.url),
  );
};
