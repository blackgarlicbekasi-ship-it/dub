"use client";

import { getSession } from "next-auth/react";
import { useEffect, useRef } from "react";

const REFRESH_THROTTLE_MS = 10 * 60 * 1000;

const ACTIVITY_EVENTS = ["pointerdown", "keydown"];

export function SessionActivity() {
  const lastRefresh = useRef(0);

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();

      if (now - lastRefresh.current < REFRESH_THROTTLE_MS) {
        return;
      }

      lastRefresh.current = now;
      getSession().catch(() => {});
    };

    const onActivity = (event: Event) => {
      if (event.isTrusted) {
        refresh();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, { passive: true });
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, onActivity);
      }

      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
