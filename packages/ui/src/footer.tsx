"use client";

import { cn, createHref } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FEATURES_LIST, LEGAL_PAGES } from "./content";
import { MaxWidthWrapper } from "./max-width-wrapper";
import { NavWordmark } from "./nav-wordmark";

const navigation = {
  product: [
    ...FEATURES_LIST.filter(({ title }) => title !== "Ingat Integrations").map(
      ({ id, title, href }) => ({
        id,
        name: title,
        href,
      }),
    ),
  ],
  resources: [
    { name: "Help Center", href: "/help" },
    { name: "Docs", href: "/docs" },
    { name: "Pricing", href: "/pricing" },
    { name: "Blog", href: "/blog" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/legal/terms" },
  ],
  legal: LEGAL_PAGES.map(({ name, slug }) => ({
    name,
    href: `/legal/${slug}`,
  })),
};

const linkListHeaderClassName = "text-sm font-medium text-neutral-900";
const linkListClassName = "flex flex-col mt-2.5 gap-3.5";
const linkListItemClassName =
  "flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors duration-75";

export function Footer({
  staticDomain,
  className,
}: {
  staticDomain?: string;
  className?: string;
}) {
  let { domain = "ingat.cc" } = useParams() as { domain: string };
  if (staticDomain) {
    domain = staticDomain;
  }

  return (
    <MaxWidthWrapper
      className={cn(
        "relative z-10 overflow-hidden border border-b-0 border-neutral-200 bg-white/50 py-16 backdrop-blur-lg md:rounded-t-2xl",
        className,
      )}
    >
      <footer>
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="flex flex-col gap-6">
            <div className="grow">
              <Link
                href={createHref("/", domain, {
                  utm_source: "Custom Domain",
                  utm_medium: "Footer",
                  utm_campaign: domain,
                  utm_content: "Logo",
                })}
                className="block max-w-fit"
              >
                <span className="sr-only">Ingat Logo</span>
                <NavWordmark className="h-8 text-neutral-800" />
              </Link>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-8 xl:col-span-2 xl:mt-0">
            <div>
              <h3 className={linkListHeaderClassName}>Product</h3>
              <ul role="list" className={linkListClassName}>
                {navigation.product.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={createHref(item.href, domain, {
                        utm_source: "Custom Domain",
                        utm_medium: "Footer",
                        utm_campaign: domain,
                        utm_content: item.name,
                      })}
                      className={linkListItemClassName}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={linkListHeaderClassName}>Resources</h3>
              <ul role="list" className={linkListClassName}>
                {navigation.resources.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={createHref(item.href, domain, {
                        utm_source: "Custom Domain",
                        utm_medium: "Footer",
                        utm_campaign: domain,
                        utm_content: item.name,
                      })}
                      className={linkListItemClassName}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={linkListHeaderClassName}>Company</h3>
              <ul role="list" className={linkListClassName}>
                {navigation.company.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={createHref(item.href, domain, {
                        utm_source: "Custom Domain",
                        utm_medium: "Footer",
                        utm_campaign: domain,
                        utm_content: item.name,
                      })}
                      className={linkListItemClassName}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-neutral-200 pt-8">
          <p className="text-xs text-neutral-500">
            &copy; {new Date().getFullYear()} Ingat. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href={createHref("/privacy", domain)}
              className="text-xs text-neutral-500 hover:text-neutral-700"
            >
              Privacy
            </Link>
            <Link
              href={createHref("/legal/terms", domain)}
              className="text-xs text-neutral-500 hover:text-neutral-700"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </MaxWidthWrapper>
  );
}
