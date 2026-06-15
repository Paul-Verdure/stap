import type { RhythmDay } from "@/components/ui/rhythm";
import { getCurrentUser } from "@/lib/auth/user";
import { getWeekRhythm } from "@/lib/challenge";
import { startOfMonthUTC } from "@/lib/date";
import { db } from "@/lib/db";
import { ChallengeState } from "@/lib/generated/prisma/enums";

/* ===========================================================================
   Profile reads (G8).
   ---------------------------------------------------------------------------
   The Profile tab needs identity fields that the daily-challenge `getUserProfile`
   helper does not surface — notably `createdAt` (the "With Stap for N days"
   counter) and `email`. Kept separate so the challenge path stays minimal.
   Prisma bypasses RLS, so every read is scoped to the authenticated user's id.
=========================================================================== */

export type ProfileIdentity = {
  displayName: string | null;
  uiLocale: "en" | "fr";
  level: "A0" | "A1" | "A2" | "B1" | "B2" | null;
  createdAt: Date;
};

/** Load the authenticated user's identity fields for the Profile hero, or null. */
export async function getProfileIdentity(): Promise<ProfileIdentity | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: {
      displayName: true,
      uiLocale: true,
      level: true,
      createdAt: true,
    },
  });
  if (!row) return null;

  return {
    displayName: row.displayName,
    uiLocale: row.uiLocale,
    level: row.level,
    createdAt: row.createdAt,
  };
}

/** Whole days elapsed since `createdAt` (never negative; same-day joins = 0). */
export function daysSince(createdAt: Date, now: Date = new Date()): number {
  const ms = now.getTime() - createdAt.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export type JourneyPreview = {
  /** The 7-day weekly rhythm for the "My rhythm" card preview. */
  weekRhythm: RhythmDay[];
  /** Attempts (DONE or MISSED) since the start of the current month. */
  seasonSteps: number;
  /** Number of life contexts the user picked. */
  contextCount: number;
};

/**
 * Real-ish previews for the two (v2-stubbed) "My journey" cards: the weekly
 * rhythm row, a season step count (month-to-date attempts), and the life
 * context count. Scoped to the authenticated user; null when unauthenticated.
 */
export async function getJourneyPreview(): Promise<JourneyPreview | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const monthStart = startOfMonthUTC();
  const [weekRhythm, seasonSteps, contextCount] = await Promise.all([
    getWeekRhythm(user.id),
    db.challenge.count({
      where: {
        userId: user.id,
        date: { gte: monthStart },
        state: { in: [ChallengeState.DONE, ChallengeState.MISSED] },
      },
    }),
    db.userLifeContext.count({ where: { userId: user.id } }),
  ]);

  return { weekRhythm, seasonSteps, contextCount };
}
