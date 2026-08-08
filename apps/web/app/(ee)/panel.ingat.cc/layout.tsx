"use client";

import { SessionActivity } from "@/ui/auth/session-activity";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export default function PanelRootLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionActivity />
      <Toaster closeButton />
      {children}
    </SessionProvider>
  );
}
