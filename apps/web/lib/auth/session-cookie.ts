import { NextResponse } from "next/server";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

const MAX_COOKIE_CHUNKS = 4;

export const SESSION_COOKIE_NAME = `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  domain: VERCEL_DEPLOYMENT
    ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : undefined,
  secure: VERCEL_DEPLOYMENT,
};

export const clearSessionCookie = (response: NextResponse) => {
  const names = [SESSION_COOKIE_NAME];

  for (let i = 0; i < MAX_COOKIE_CHUNKS; i++) {
    names.push(`${SESSION_COOKIE_NAME}.${i}`);
  }

  for (const name of names) {
    response.cookies.set(name, "", {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    });
  }

  return response;
};
