/* ===========================================================================
   Daily-challenge selection tuning.
   ---------------------------------------------------------------------------
   Shared by the runtime (lib/challenge.ts) and the catalog lint
   (scripts/content-check.ts). Dependency-free on purpose: the lint validates
   the JSON sources without a database, so it must be able to import these
   numbers without dragging in Prisma.

   Keeping them here is what stops the lint's content thresholds from drifting
   away from the rule they are supposed to protect.
=========================================================================== */

/** Difficulty ladder, ascending. Mirrors the `Level` enum in the schema. */
export const LEVELS = ["A0", "A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];

/**
 * Phrases used within this many days are excluded from the day's pool.
 *
 * Raising it is NOT free: the exclusion has to leave a usable pool behind, so
 * the floor below rises with it and the catalog has to grow to match. At the
 * current content volume the binding constraint is A0, whose band is itself
 * alone and whose worst single-context pool is 21.
 */
export const REPEAT_WINDOW_DAYS = 14;

/** Choices that must survive the window before a pick stops being a foregone conclusion. */
export const MIN_REMAINING_CHOICES = 6;

/**
 * Smallest acceptable pool for a (level band × one life context) pair — the
 * worst case a real user can hit, since a user may select a single context.
 *
 * Derived, not chosen: below this the window empties the pool, selection falls
 * back to allowing a repeat, and the anti-repeat guarantee silently stops
 * holding. `pnpm content:check --strict` enforces it.
 */
export const MIN_BAND_CONTEXT_POOL = REPEAT_WINDOW_DAYS + MIN_REMAINING_CHOICES;

/**
 * The levels a user at `level` may be served: their own, plus the one below
 * for consolidation.
 *
 * Replaces the original "at or below" rule, which made the catalog work
 * against itself — every phrase added at A0 diluted what a B2 user saw, so
 * enriching the beginner levels actively degraded the advanced ones.
 */
export function bandLevels(level: Level): Level[] {
  const index = LEVELS.indexOf(level);
  return LEVELS.slice(Math.max(0, index - 1), index + 1);
}
