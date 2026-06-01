import type { Formats } from "next-intl";

/* ===========================================================================
   Canonical locale-aware formatting presets (G2.5).
   ---------------------------------------------------------------------------
   The single source of truth for how Stap renders dates, times and numbers.
   Wired into next-intl via i18n/request.ts, so every `useFormatter()` /
   `getFormatter()` call resolves these names against the active locale —
   no component ever hand-rolls `Intl.DateTimeFormat`.

   The locale drives the conventions automatically: weekday/month names
   (Thu vs jeu.), day/month order, and 12h vs 24h clocks (en = 12h, fr = 24h).
=========================================================================== */
export const formats = {
  dateTime: {
    // "Thursday 28 May 2026" / "jeudi 28 mai 2026"
    full: {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
    // "Thu 28 May" / "jeu. 28 mai" — the compact DateLine form.
    short: {
      weekday: "short",
      day: "numeric",
      month: "short",
    },
    // "8:00 AM" / "08:00" — reminder slots, timestamps.
    time: {
      hour: "numeric",
      minute: "numeric",
    },
  },
  number: {
    // Whole counts (steps, attempts) — never a stray decimal.
    integer: {
      maximumFractionDigits: 0,
    },
  },
} satisfies Formats;

/** Names of the available date/time presets (for typed `format.dateTime`). */
export type DateTimeFormatName = keyof (typeof formats)["dateTime"];
