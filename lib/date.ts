/* ===========================================================================
   Date utilities for the daily-challenge cadence (G4).
   ---------------------------------------------------------------------------
   The "day" key is computed in UTC so the per-day challenge is deterministic
   and matches Prisma's @db.Date columns (which carry no time/zone). A real
   product would use the user's timezone; UTC is a deliberate, documented
   simplification for now.
=========================================================================== */

const DAY_MS = 86_400_000;

/** Midnight-UTC Date for the given day (defaults to now) — a date-only key. */
export function dateOnlyUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** "YYYY-MM-DD" for a Date (UTC). */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The last `n` date-only days ending today (oldest first, today last). */
export function lastNDatesUTC(n: number, from: Date = new Date()): Date[] {
  const base = dateOnlyUTC(from);
  return Array.from(
    { length: n },
    (_, i) => new Date(base.getTime() - (n - 1 - i) * DAY_MS),
  );
}

/** Subtract `days` from a date-only Date (UTC). */
export function subDaysUTC(d: Date, days: number): Date {
  return new Date(dateOnlyUTC(d).getTime() - days * DAY_MS);
}

/** Monday-start week boundary (UTC date-only) for the given day. */
export function startOfWeekUTC(d: Date = new Date()): Date {
  const base = dateOnlyUTC(d);
  return new Date(base.getTime() - ((base.getUTCDay() + 6) % 7) * DAY_MS);
}

/** First day of the given day's month (UTC date-only). */
export function startOfMonthUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Deterministic 32-bit FNV-1a hash of a string — stable across processes. */
export function hashToInt(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
