"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Replace", icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" },
  { href: "/history", label: "History", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/telegram", label: "Telegram", icon: "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" },
];

export default function PanelDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden border-r border-neutral-200 bg-white md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-neutral-200 px-5">
          <Link href="/" className="text-lg font-bold text-neutral-900">
            Ingat Panel
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = item.href === "/"
                ? pathname === "/" || pathname === ""
                : (pathname || "").startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-neutral-100 font-medium text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      <div className="md:hidden sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-neutral-200 bg-white px-4">
        <span className="text-lg font-bold text-neutral-900">Ingat Panel</span>
        <div className="flex items-center gap-2 ml-auto">
          {navItems.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/" || pathname === ""
              : (pathname || "").startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive ? "bg-neutral-100 text-neutral-900" : "text-neutral-500"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="bg-neutral-50 min-h-screen">
        {children}
      </main>
    </div>
  );
}
