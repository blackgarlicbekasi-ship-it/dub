"use client";

import { ModalProvider } from "@/ui/modals/modal-provider";
import { SessionActivity } from "@/ui/auth/session-activity";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionActivity />
      <ModalProvider>{children}</ModalProvider>
    </SessionProvider>
  );
}
