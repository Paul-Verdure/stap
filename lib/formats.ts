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
    // "Thu 28 May" / "jeu. 28 mai" — the compact DateLine form. Date-only
    // values (Challenge.date) are UTC-midnight keys, so format them in UTC
    // to avoid an off-by-one day on servers west of Greenwich.
    short: {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    },
    // "May 2026" / "mai 2026" — Journal month group labels (date-only, UTC).
    month: {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
    // "8:00 AM" / "08:00" — a real timestamp, rendered in the viewer's zone.
    time: {
      hour: "numeric",
      minute: "numeric",
    },
    // "8:00 AM" / "08:00" — a reminder slot, which is a wall-clock time rather
    // than an instant: the same digits everywhere. Pinned to UTC for the same
    // reason `short` is, so the caller builds its Date with Date.UTC and the
    // value cannot drift with the zone that happens to render it.
    slot: {
      hour: "numeric",
      minute: "numeric",
      timeZone: "UTC",
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
