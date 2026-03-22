"use client";

import { Analytics as DubAnalytics } from "@dub/analytics/react";
import { KeyboardShortcutProvider, TooltipProvider } from "@dub/ui";
import PlausibleProvider from "next-plausible";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export default function RootProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <PlausibleProvider domain="ingat.cc" revenue />
      <KeyboardShortcutProvider>
        <Toaster className="pointer-events-auto" closeButton />
        {children}
        <DubAnalytics
          apiHost="/_proxy/dub"
          cookieOptions={{
            domain: process.env.VERCEL === "1" ? ".ingat.cc" : "localhost",
          }}
          domainsConfig={{
            refer: "refer.ingat.cc",
          }}
        />
      </KeyboardShortcutProvider>
    </TooltipProvider>
  );
}
