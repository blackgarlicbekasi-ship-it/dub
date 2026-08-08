"use client";

import { SessionActivity } from "@/ui/auth/session-activity";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionActivity />
      {children}
    </SessionProvider>
  );
}
