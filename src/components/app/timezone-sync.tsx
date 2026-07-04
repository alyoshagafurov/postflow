"use client";

import { useEffect } from "react";

/**
 * Silently captures the browser's IANA timezone and persists it to the user
 * profile (used for daily-limit accounting and schedule display). Runs at most
 * once per changed timezone thanks to the localStorage guard.
 */
export function TimezoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      if (localStorage.getItem("pf_tz") === tz) return;
      void fetch("/api/me/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: tz }),
      })
        .then((r) => {
          if (r.ok) localStorage.setItem("pf_tz", tz);
        })
        .catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  return null;
}
