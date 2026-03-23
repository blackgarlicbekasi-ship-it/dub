"use client";

import { MaxWidthWrapper } from "@dub/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Replace" },
  { href: "/history", label: "History" },
  { href: "/telegram", label: "Telegram" },
];

export function PanelNav() {
  const pathname = usePathname();

  return (
    <div className="sticky left-0 right-0 top-0 z-20 border-b border-neutral-200 bg-white">
      <MaxWidthWrapper>
        <div className="flex h-14 w-full items-center gap-8">
          <Link href="/" className="text-lg font-bold text-black">
            Ingat Panel
          </Link>
          <div className="flex items-center gap-4">
            {tabs.map((tab) => {
              const isActive =
                tab.href === "/"
                  ? pathname === "/" || pathname === ""
                  : pathname?.startsWith(tab.href);
              return (
                <Link
                  href={tab.href}
                  key={tab.href}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
