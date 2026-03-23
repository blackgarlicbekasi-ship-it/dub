import { logger } from "@/lib/axiom/server";
import { transformMiddlewareRequest } from "@axiomhq/nextjs";
import {
  ADMIN_HOSTNAMES,
  API_HOSTNAMES,
  APP_HOSTNAMES,
  DEFAULT_REDIRECTS,
  PANEL_HOSTNAMES,
  SHORT_DOMAIN,
  isValidUrl,
} from "@dub/utils";
import { PARTNERS_HOSTNAMES } from "@dub/utils/src/constants";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { AdminMiddleware } from "./lib/middleware/admin";
import { ApiMiddleware } from "./lib/middleware/api";
import { AppMiddleware } from "./lib/middleware/app";
import { CreateLinkMiddleware } from "./lib/middleware/create-link";
import { LinkMiddleware } from "./lib/middleware/link";
import { PanelMiddleware } from "./lib/middleware/panel";
import { PartnersMiddleware } from "./lib/middleware/partners";
import { parse } from "./lib/middleware/utils/parse";
import { supportedWellKnownFiles } from "./lib/well-known";

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!api/|_next/|_proxy/|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest).*)",
  ],
};

const MARKETING_PATHS = new Set([
  "/",
  "/home",
  "/pricing",
  "/blog",
  "/enterprise",
  "/customers",
  "/legal",
  "/tools",
  "/help",
  "/links",
  "/analytics",
  "/partners",
  "/docs",
  "/integrations",
  "/about",
  "/careers",
  "/brand",
  "/changelog",
  "/contact",
  "/privacy",
  "/sdks",
  "/solutions",
  "/compare",
  "/features",
  "/not-found",
]);

function isMarketingPath(path: string): boolean {
  if (MARKETING_PATHS.has(path)) return true;
  for (const prefix of MARKETING_PATHS) {
    if (prefix !== "/" && path.startsWith(prefix + "/")) return true;
  }
  return false;
}

// Add X-Robots-Tag: noindex to any response
function withNoIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, nosnippet");
  return response;
}

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { domain, path, key, fullKey } = parse(req);

  logger.info(...transformMiddlewareRequest(req));
  ev.waitUntil(logger.flush());

  if (APP_HOSTNAMES.has(domain)) {
    const pathSegments = path.split("/").filter(Boolean);
    const isShortlink = pathSegments.length === 1 && !["login","register","forgot-password","onboarding","account","new","workspaces","embed","_static","app.dub.co"].includes(pathSegments[0]);
    if (isShortlink) {
      return withNoIndex(await LinkMiddleware(req, ev));
    }
    return withNoIndex(await AppMiddleware(req));
  }

  if (API_HOSTNAMES.has(domain)) {
    return ApiMiddleware(req);
  }

  if (path.startsWith("/stats/")) {
    return withNoIndex(NextResponse.rewrite(new URL(`/${domain}${path}`, req.url)));
  }

  if (path.startsWith("/.well-known/")) {
    const file = path.split("/.well-known/").pop();
    if (file && supportedWellKnownFiles.includes(file)) {
      return NextResponse.rewrite(
        new URL(`/wellknown/${domain}/${file}`, req.url),
      );
    }
  }

  if (ADMIN_HOSTNAMES.has(domain)) {
    return withNoIndex(await AdminMiddleware(req));
  }

  if (PANEL_HOSTNAMES.has(domain)) {
    return withNoIndex(await PanelMiddleware(req));
  }

  if (PARTNERS_HOSTNAMES.has(domain)) {
    return withNoIndex(await PartnersMiddleware(req));
  }

  if (domain === SHORT_DOMAIN) {
    if (DEFAULT_REDIRECTS[key]) {
      return withNoIndex(NextResponse.redirect(DEFAULT_REDIRECTS[key]));
    }

    if (isMarketingPath(path)) {
      return withNoIndex(NextResponse.rewrite(new URL(`/${domain}${path}`, req.url)));
    }

    return withNoIndex(await LinkMiddleware(req, ev));
  }

  if (isValidUrl(fullKey)) {
    return withNoIndex(await CreateLinkMiddleware(req));
  }

  return withNoIndex(await LinkMiddleware(req, ev));
}
