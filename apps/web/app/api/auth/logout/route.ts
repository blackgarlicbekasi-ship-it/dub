import { NextResponse } from "next/server";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : undefined;

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const callbackUrl = searchParams.get("callbackUrl") || "/login";

  const response = NextResponse.json({ url: callbackUrl });

  // Clear session token with the correct domain
  const cookieName = VERCEL_DEPLOYMENT
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    domain: VERCEL_DEPLOYMENT ? COOKIE_DOMAIN : undefined,
    secure: VERCEL_DEPLOYMENT,
    maxAge: 0,
  });

  // Also clear callback-url and csrf-token cookies
  response.cookies.set(
    VERCEL_DEPLOYMENT
      ? "__Secure-next-auth.callback-url"
      : "next-auth.callback-url",
    "",
    {
      path: "/",
      maxAge: 0,
      secure: VERCEL_DEPLOYMENT,
    },
  );

  response.cookies.set(
    VERCEL_DEPLOYMENT
      ? "__Host-next-auth.csrf-token"
      : "next-auth.csrf-token",
    "",
    {
      path: "/",
      maxAge: 0,
      secure: VERCEL_DEPLOYMENT,
    },
  );

  return response;
}
