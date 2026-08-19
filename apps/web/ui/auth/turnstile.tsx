"use client";

import Script from "next/script";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export const turnstileEnabled = Boolean(SITE_KEY);

export interface TurnstileHandle {
  reset: () => void;
}

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const Turnstile = forwardRef<
  TurnstileHandle,
  { onToken: (token: string) => void }
>(({ onToken }, ref) => {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [scriptReady, setScriptReady] = useState(false);

  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current("");

      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current);
      }
    },
  }));

  useEffect(() => {
    if (!SITE_KEY || !scriptReady || widgetId.current) {
      return;
    }

    if (!container.current || !window.turnstile) {
      return;
    }

    widgetId.current = window.turnstile.render(container.current, {
      sitekey: SITE_KEY,
      appearance: "interaction-only",
      callback: (token: string) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(""),
      "timeout-callback": () => onTokenRef.current(""),
      "error-callback": () => onTokenRef.current(""),
    });

    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [scriptReady]);

  if (!SITE_KEY) {
    return null;
  }

  return (
    <>
      <Script
        id="cf-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={container} />
    </>
  );
});

Turnstile.displayName = "Turnstile";
