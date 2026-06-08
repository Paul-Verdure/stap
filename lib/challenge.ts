import type { RhythmDay, RhythmState } from "@/components/ui/rhythm";
import { getCurrentUser } from "@/lib/auth/user";
import { dateOnlyUTC, hashToInt, isoDate, lastNDatesUTC, subDaysUTC } from "@/lib/date";
import { db } from "@/lib/db";

/* ===========================================================================
   Daily-challenge selection + weekly rhythm (G4).
   ---------------------------------------------------------------------------
   Selection rule (decided in G4): eligible phrases are at or below the user's
   level AND share at least one of the user's life contexts. The phrase for a
   day is picked deterministically from that pool by hash(userId + date), and
   phrases used in the last REPEAT_WINDOW_DAYS are avoided (unless that would
   empty the pool). Prisma connects as the table owner; every query is scoped
   to the user's id.

   The per-day Challenge row is created lazily on first read (find-or-create on
   the (userId, date) unique). State transitions (PREPARED / DONE) are written
   by the preparation + validation flows in G5; G4 only renders from state.
=========================================================================== */

const LEVELS = ["A0", "A1", "A2", "B1", "B2"] as const;
type Level = (typeof LEVELS)[number];

const REPEAT_WINDOW_DAYS = 14;
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

/** Load the authenticated user's onboarding profile, or null. */
export async function getUserProfile(): Promise<UserProfile | null> {
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
}

/** Levels at or below the given one (e.g. A2 -> A0, A1, A2). */
function eligibleLevels(level: Level): Level[] {
  const max = LEVELS.indexOf(level);
  return LEVELS.filter((_, i) => i <= max);
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
      level: { in: eligibleLevels(level) },
      ...(contextSlugs.length
        ? { lifeContexts: { some: { lifeContext: { slug: { in: contextSlugs } } } } }
        : {}),
    },
    select: { id: true },
    orderBy: { id: "asc" }, // stable order for the deterministic pick
  });
  if (eligible.length === 0) return null;

  const recent = await db.challenge.findMany({
    where: { userId, date: { gte: subDaysUTC(date, REPEAT_WINDOW_DAYS), lt: date } },
    select: { phraseId: true },
  });
  const recentIds = new Set(recent.map((r) => r.phraseId));

  let pool = eligible.filter((p) => !recentIds.has(p.id));
  if (pool.length === 0) pool = eligible; // window exhausted -> allow a repeat

  const index = hashToInt(`${userId}:${isoDate(date)}`) % pool.length;
  return pool[index].id;
}

export type TodayChallenge = NonNullable<
  Awaited<ReturnType<typeof getTodayChallenge>>
>;

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
 * (excluding it) — the Home vocabulary preview. Deterministic order.
 */
export async function getRelatedPhrases(phraseId: string, limit = 4) {
  const themes = await db.phraseTheme.findMany({
    where: { phraseId },
    select: { themeId: true },
  });
  const themeIds = themes.map((t) => t.themeId);
  if (themeIds.length === 0) return [];

  return db.phrase.findMany({
    where: {
      id: { not: phraseId },
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
