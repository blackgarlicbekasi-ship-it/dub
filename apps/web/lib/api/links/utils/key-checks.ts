import { DubApiError } from "@/lib/api/errors";
import { isPlatformDomain } from "@/lib/api/domains/platform-domains";
import { isBlacklistedKey, isReservedUsername } from "@/lib/edge-config";
import { checkIfKeyExists } from "@/lib/planetscale";
import { Project } from "@dub/prisma/client";
import {
  DEFAULT_REDIRECTS,
  isDubDomain,
  isReservedKeyGlobal,
  RESERVED_SLUGS,
  SHORT_DOMAIN,
} from "@dub/utils";

const RESERVED_SHORT_DOMAIN_KEYS = new Set([
  "home",
  "pricing",
  "blog",
  "enterprise",
  "customers",
  "legal",
  "tools",
  "help",
  "links",
  "analytics",
  "partners",
  "docs",
  "integrations",
  "about",
  "careers",
  "brand",
  "changelog",
  "contact",
  "privacy",
  "sdks",
  "solutions",
  "compare",
  "features",
  "not-found",
  "login",
  "register",
  "forgot-password",
  "onboarding",
  "account",
  "workspaces",
  "embed",
  "api",
  "_next",
  "_proxy",
]);

export async function keyChecks({
  domain,
  key,
  workspace,
}: {
  domain: string;
  key: string;
  workspace?: Pick<Project, "plan">;
}): Promise<{ error: string | null; code?: DubApiError["code"] }> {
  if ((key.length === 0 || key === "_root") && workspace?.plan === "free") {
    return {
      error:
        "You can only set a redirect for your root domain on a Pro plan and above. Upgrade to Pro to unlock this feature.",
      code: "forbidden",
    };
  }

  if (isReservedKeyGlobal(key)) {
    return {
      error: `${key} is a reserved path and cannot be used as a short link.`,
      code: "forbidden",
    };
  }

  if (
    RESERVED_SHORT_DOMAIN_KEYS.has(key) &&
    (domain === SHORT_DOMAIN || (await isPlatformDomain(domain)))
  ) {
    return {
      error: "This slug is reserved and cannot be used",
      code: "forbidden",
    };
  }

  const link = await checkIfKeyExists({ domain, key });
  if (link) {
    return {
      error: "Duplicate key: This short link already exists.",
      code: "conflict",
    };
  }

  if (isDubDomain(domain) && process.env.NEXT_PUBLIC_IS_DUB) {
    if (domain === "dub.sh" || domain === "dub.link") {
      if (DEFAULT_REDIRECTS[key] || RESERVED_SLUGS.includes(key)) {
        return {
          error: "Duplicate key: This short link already exists.",
          code: "conflict",
        };
      }
      if (await isBlacklistedKey(key)) {
        return {
          error: "Invalid key.",
          code: "unprocessable_entity",
        };
      }
    }
    if (key.length <= 3 && (!workspace || workspace.plan === "free")) {
      return {
        error: `You can only use keys that are 3 characters or less on a Pro plan and above. Upgrade to Pro to register a ${key.length}-character key.`,
        code: "forbidden",
      };
    }
    if (
      domain === "dub.link" &&
      key.length <= 5 &&
      (!workspace || workspace.plan === "free" || workspace.plan === "pro")
    ) {
      return {
        error: `You can only use dub.link with keys that are 5 characters or less on a Business plan and above. Upgrade to Business to register a ${key.length}-character dub.link key.`,
        code: "forbidden",
      };
    }
    if (
      (await isReservedUsername(key)) &&
      (!workspace || workspace.plan === "free")
    ) {
      return {
        error:
          "This is a premium key. You can only use this key on a Pro plan and above. Upgrade to Pro to register this key.",
        code: "forbidden",
      };
    }
  }
  return {
    error: null,
  };
}
