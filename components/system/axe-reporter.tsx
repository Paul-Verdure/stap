"use client";

import { useEffect } from "react";

// Runs @axe-core/react in development only. Findings appear in the browser
// console as accessibility violations, helping us catch issues at edit-time
// instead of accumulating them for a final sweep.
// Stripped from production builds via the `process.env.NODE_ENV` check.

export function AxeReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    void (async () => {
      const [{ default: React }, { default: ReactDOM }, { default: axe }] =
        await Promise.all([
          import("react"),
          import("react-dom"),
          import("@axe-core/react"),
        ]);
      if (cancelled) return;
      // 1s debounce: lets the page settle after navigation before scanning.
      // The 5th arg scopes the scan to our app and EXCLUDES Next.js's own dev
      // tooling (the <nextjs-portal> shadow DOM), whose gray-on-gray overlay UI
      // otherwise floods the console with contrast false-positives that aren't
      // ours. Keeps the dev a11y console trustworthy.
      void axe(React, ReactDOM, 1000, undefined, {
        exclude: [["nextjs-portal"]],
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
