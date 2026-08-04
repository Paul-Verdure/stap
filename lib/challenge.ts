import { cache } from "react";

import type { RhythmDay, RhythmState } from "@/components/ui/rhythm";
import { getCurrentUser } from "@/lib/auth/user";
import {
  bandLevels,
  REPEAT_WINDOW_DAYS,
  type Level,
} from "@/lib/challenge-config";
import { dateOnlyUTC, hashToInt, isoDate, lastNDatesUTC, subDaysUTC } from "@/lib/date";
import { db } from "@/lib/db";
import { localize } from "@/lib/localize";

/* ===========================================================================
   Daily-challenge selection + weekly rhythm (G4, revised in H).
   ---------------------------------------------------------------------------
   Selection rule: eligible phrases sit in the user's LEVEL BAND (their level
   plus the one below, see bandLevels) AND share at least one of the user's
   life contexts. From that pool the day's phrase is picked deterministically
   by hash(userId + date), after two guarded narrowings — phrases seen in the
   last REPEAT_WINDOW_DAYS, then phrases sharing yesterday's theme. Each
   narrowing is skipped if it would empty the pool, so selection always
   returns something. Prisma connects as the table owner; every query is
   scoped to the user's id.

   The band replaced an "at or below" rule in phase H. That rule made the
   catalog work against itself: every phrase added at A0 diluted what a B2
   user saw, so filling the beginner levels measurably degraded the advanced
   ones (a B2 profile was being served 87% content below its level).

   The per-day Challenge row is created lazily on first read (find-or-create on
   the (userId, date) unique). State transitions (PREPARED / DONE) are written
   by the preparation + validation flows in G5; G4 only renders from state.
=========================================================================== */

const RHYTHM_DAYS = 7;

// Challenge reads include the phrase plus its life contexts (with localized
// names) so the Home card can show the "where to use it" line.
const CHALLENGE_INCLUDE = {
  phrase: {
    include: {
      lifeContexts: {
        include: {
          lifeContext: { select: { slug: true, nameEn: true, nameFr: true } },
        },
      },
    },
  },
} as const;

export type UserProfile = {
  id: string;
  displayName: string | null;
  uiLocale: "en" | "fr";
  level: Level;
  contextSlugs: string[];
};

/**
 * Load the authenticated user's onboarding profile, or null.
 * Cached per render pass (React.cache) — the layout and the page both need
 * it, and it costs an auth check plus a DB read.
 */
export const getUserProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      displayName: true,
      uiLocale: true,
      level: true,
      lifeContexts: { select: { lifeContext: { select: { slug: true } } } },
    },
  });
  if (!row || !row.level) return null;

  return {
    id: row.id,
    displayName: row.displayName,
    uiLocale: row.uiLocale,
    level: row.level,
    contextSlugs: row.lifeContexts.map((c) => c.lifeContext.slug),
  };
});

/**
 * Narrow `pool` by `keep`, unless that would empty it.
 *
 * Every filter in the selection chain is a preference, never a constraint: the
 * user must get a challenge today even when the catalog cannot honour all of
 * them at once.
 */
function narrow<T>(pool: T[], keep: (item: T) => boolean): T[] {
  const narrowed = pool.filter(keep);
  return narrowed.length > 0 ? narrowed : pool;
}

/**
 * Pick the phrase id for a given user + day, or null when no phrase matches.
 * Pure with respect to the request (takes explicit args) so it is testable.
 */
export async function selectPhraseForDay(
  userId: string,
  level: Level,
  contextSlugs: string[],
  date: Date,
): Promise<string | null> {
  const eligible = await db.phrase.findMany({
    where: {
      level: { in: bandLevels(level) },
      ...(contextSlugs.length
        ? { lifeContexts: { some: { lifeContext: { slug: { in: contextSlugs } } } } }
        : {}),
    },
    // Themes come along for the rotation below — one query, not two.
    select: { id: true, themes: { select: { themeId: true } } },
    orderBy: { id: "asc" }, // stable order for the deterministic pick
  });
  if (eligible.length === 0) return null;

  // One read covers both narrowings: the repeat window and yesterday's themes.
  const recent = await db.challenge.findMany({
    where: { userId, date: { gte: subDaysUTC(date, REPEAT_WINDOW_DAYS), lt: date } },
    select: { phraseId: true, date: true },
  });
  const recentIds = new Set(recent.map((r) => r.phraseId));

  const yesterdayIso = isoDate(subDaysUTC(date, 1));
  const yesterdayPhraseId = recent.find(
    (r) => isoDate(r.date) === yesterdayIso,
  )?.phraseId;
  // Yesterday's phrase may sit outside today's pool (the user can change level
  // or contexts), so its themes are read directly rather than looked up above.
  const yesterdayThemes = new Set(
    yesterdayPhraseId
      ? (
          await db.phraseTheme.findMany({
            where: { phraseId: yesterdayPhraseId },
            select: { themeId: true },
          })
        ).map((t) => t.themeId)
      : [],
  );

  let pool = narrow(eligible, (p) => !recentIds.has(p.id));
  // Theme rotation: two greetings in a row reads as a catalog that has run
  // out, even when it hasn't.
  pool = narrow(pool, (p) => !p.themes.some((t) => yesterdayThemes.has(t.themeId)));

  const index = hashToInt(`${userId}:${isoDate(date)}`) % pool.length;
  return pool[index].id;
}

export type TodayChallenge = NonNullable<
  Awaited<ReturnType<typeof getTodayChallenge>>
>;

/**
 * The localized name of the first life context the phrase shares with the
 * user — the "where to use it" line on the challenge card. Undefined when the
 * phrase carries none of the user's contexts (only reachable for a phrase
 * surfaced outside the daily selection).
 */
export function userContextName(
  phrase: {
    lifeContexts: {
      lifeContext: { slug: string; nameEn: string; nameFr: string };
    }[];
  },
  contextSlugs: string[],
  locale: string,
): string | undefined {
  const ctx = phrase.lifeContexts.find((lc) =>
    contextSlugs.includes(lc.lifeContext.slug),
  )?.lifeContext;
  return ctx ? localize(ctx, "name", locale) : undefined;
}

/** Find-or-create today's challenge for a profile (includes the phrase). */
export async function getTodayChallenge(profile: UserProfile) {
  const date = dateOnlyUTC();
  const where = { userId_date: { userId: profile.id, date } };

  const existing = await db.challenge.findUnique({ where, include: CHALLENGE_INCLUDE });
  if (existing) return existing;

  const phraseId = await selectPhraseForDay(
    profile.id,
    profile.level,
    profile.contextSlugs,
    date,
  );
  if (!phraseId) return null;

  try {
    return await db.challenge.create({
      data: { userId: profile.id, date, phraseId, state: "PENDING" },
      include: CHALLENGE_INCLUDE,
    });
  } catch {
    // Lost a creation race on the (userId, date) unique — read the winner.
    return db.challenge.findUnique({ where, include: CHALLENGE_INCLUDE });
  }
}

/**
 * Up to `limit` catalog phrases sharing a theme with the challenge phrase
 * (excluding it) — the Home vocabulary preview, the preparation key words, and
 * the distractor pool for all three games. Deterministic order.
 *
 * Neighbours are kept inside the challenge phrase's own level band. Without
 * that, a B2 challenge pulls A0 phrases into its key words and offers them as
 * game distractors, which makes every round trivially guessable and undoes the
 * band applied to the challenge itself.
 */
export async function getRelatedPhrases(phraseId: string, limit = 4) {
  const phrase = await db.phrase.findUnique({
    where: { id: phraseId },
    select: { level: true, themes: { select: { themeId: true } } },
  });
  if (!phrase) return [];

  const themeIds = phrase.themes.map((t) => t.themeId);
  if (themeIds.length === 0) return [];

  return db.phrase.findMany({
    where: {
      id: { not: phraseId },
      level: { in: bandLevels(phrase.level) },
      themes: { some: { themeId: { in: themeIds } } },
    },
    orderBy: { id: "asc" },
    take: limit,
  });
}

/** The 7-day weekly rhythm derived from challenge state (no feeling yet). */
export async function getWeekRhythm(userId: string): Promise<RhythmDay[]> {
  const days = lastNDatesUTC(RHYTHM_DAYS);
  const todayIso = isoDate(dateOnlyUTC());

  const rows = await db.challenge.findMany({
    where: { userId, date: { in: days } },
    select: { date: true, state: true, feeling: true },
  });
  const byIso = new Map(rows.map((r) => [isoDate(r.date), r]));

  return days.map((d) => {
    const iso = isoDate(d);
    const isToday = iso === todayIso;
    const row = byIso.get(iso);

    let rhythm: RhythmState = "empty";
    if (row) {
      if (row.state === "DONE") {
        rhythm =
          row.feeling === "HESITANT"
            ? "hesitant"
            : row.feeling === "MISSED"
              ? "missed"
              : "at-ease"; // AT_EASE or (defensively) no feeling
      } else if (row.state === "SKIPPED") {
        rhythm = "skip"; // "no chance today"
      } else if (row.state === "MISSED") {
        rhythm = "missed";
      } else if (!isToday) {
        rhythm = "missed"; // a past PENDING/PREPARED day left unvalidated
      }
    }

    return { state: rhythm, today: isToday };
  });
}
