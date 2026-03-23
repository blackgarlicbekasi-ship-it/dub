"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export default function PanelRootLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Toaster closeButton />
      {children}
    </SessionProvider>
  );
}
