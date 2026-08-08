"use client";

import { SessionActivity } from "@/ui/auth/session-activity";
import { SessionProvider } from "next-auth/react";
import { ReactNode, Suspense } from "react";

export default function PartnersLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionActivity />
      <Suspense>{children}</Suspense>
    </SessionProvider>
  );
}
