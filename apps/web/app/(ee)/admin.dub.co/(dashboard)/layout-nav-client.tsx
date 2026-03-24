"use client";

import {
  ClientOnly,
  MaxWidthWrapper,
  Popover,
  useMediaQuery,
} from "@dub/ui";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const tabs = [
  { href: "/users", label: "Users" },
  { href: "/plans", label: "Plans" },
  { href: "/domains", label: "Domains" },
  { href: "/links", label: "Links" },
  { href: "/analytics", label: "Analytics" },
];

export function AdminNav() {
  const [openPopover, setOpenPopover] = useState(false);
  const { isMobile } = useMediaQuery();
  const pathname = usePathname();

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  const NavContent = () => (
    <div className="flex w-full flex-col gap-1 p-2">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Link
            href={tab.href}
            key={tab.href}
            className={`block w-full rounded-md px-4 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 active:bg-neutral-200 ${
              isActive ? "bg-neutral-100" : ""
            }`}
            onClick={() => setOpenPopover(false)}
          >
            {tab.label}
          </Link>
        );
      })}
      <div className="my-1 border-t border-neutral-200" />
      <button
        onClick={handleLogout}
        className="block w-full rounded-md px-4 py-2 text-left text-sm text-neutral-500 transition-colors hover:bg-neutral-100"
      >
        Log out
      </button>
    </div>
  );

  return (
    <div className="sticky left-0 right-0 top-0 z-20 border-b border-neutral-200 bg-white">
      <MaxWidthWrapper>
        <div className="flex h-16 w-full items-center justify-between">
          <div className="flex items-center gap-8 sm:gap-12">
            <Link href="/" className="text-xl font-bold text-black">
              Ingat
            </Link>
            <ClientOnly>
              {!isMobile && (
                <div className="flex items-center gap-4">
                  {tabs.map((tab) => {
                    const isActive =
                      pathname === tab.href ||
                      pathname?.startsWith(`${tab.href}/`);
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
              )}
            </ClientOnly>
          </div>
          <ClientOnly>
            {isMobile ? (
              <Popover
                content={<NavContent />}
                openPopover={openPopover}
                setOpenPopover={setOpenPopover}
                mobileOnly
              >
                <button className="text-neutral-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </Popover>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Log out
              </button>
            )}
          </ClientOnly>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
