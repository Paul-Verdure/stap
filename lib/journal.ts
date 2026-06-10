import type { UserProfile } from "@/lib/challenge";
import { isoDate, startOfMonthUTC, startOfWeekUTC, subDaysUTC } from "@/lib/date";
import { db } from "@/lib/db";
import {
  matchesJournalFilters,
  type JournalFacet,
  type JournalFeeling,
  type JournalFilters,
} from "@/lib/journal-filters";

/* ===========================================================================
   Journal data (G6) — the memory notebook behind /journal.
   ---------------------------------------------------------------------------
   A JournalEntry is created only by challenge validation, so every entry has
   a DONE challenge behind it; the entry's feeling, phrase and date are read
   THROUGH that challenge (single source of truth, no duplication). Prisma
   connects as the table owner — every query is scoped to the user's id.

   Entries are mapped to a flat, locale-resolved view model once at the top of
   the request; grouping and (later) filtering are pure functions over that
   shape so the page, the quick filters and the filter sheet share one
   vocabulary.
=========================================================================== */

// The journal volume grows by at most one entry per day, so reading the whole
// notebook in one query stays small for years; pagination is a display
// concern (slice), not a data one. Revisit if the product ever multiplies
// entries per day.
const ENTRY_INCLUDE = {
  challenge: {
    include: {
      phrase: {
        include: {
          lifeContexts: {
            include: {
              lifeContext: { select: { slug: true, nameEn: true, nameFr: true } },
            },
          },
        },
      },
    },
  },
} as const;

// The per-entry "feel shape" values intentionally match the rhythm-vocabulary
// states (RhythmState) so the card can feed RhythmUnit directly.
export type { JournalFeeling } from "@/lib/journal-filters";

export type JournalEntryView = {
  id: string;
  /** The challenge day (UTC date-only), NOT the row's created timestamp. */
  date: Date;
  feeling: JournalFeeling;
  textNl: string;
  meaning: string;
  /** Localized names of the phrase's contexts ∩ the user's own contexts. */
  contexts: string[];
  /** Matching slugs, parallel to `contexts` — the filtering key. */
  contextSlugs: string[];
  body: string | null;
  heardWords: string[];
};

/** All journal entries for a user, newest challenge day first. */
export async function getJournalEntries(
  profile: Pick<UserProfile, "id" | "contextSlugs">,
  locale: "en" | "fr",
): Promise<JournalEntryView[]> {
  const rows = await db.journalEntry.findMany({
    where: { userId: profile.id },
    include: ENTRY_INCLUDE,
    orderBy: { challenge: { date: "desc" } },
  });

  const fr = locale === "fr";
  const userContexts = new Set(profile.contextSlugs);

  return rows.map((row) => {
    const { challenge } = row;
    const contexts = challenge.phrase.lifeContexts
      .map((lc) => lc.lifeContext)
      .filter((c) => userContexts.has(c.slug));

    return {
      id: row.id,
      date: challenge.date,
      feeling:
        challenge.feeling === "HESITANT"
          ? "hesitant"
          : challenge.feeling === "MISSED"
            ? "missed"
            : "at-ease", // AT_EASE or (defensively) no feeling
      textNl: challenge.phrase.textNl,
      meaning: fr ? challenge.phrase.meaningFr : challenge.phrase.meaningEn,
      contexts: contexts.map((c) => (fr ? c.nameFr : c.nameEn)),
      contextSlugs: contexts.map((c) => c.slug),
      body: row.body,
      heardWords: row.heardWords,
    };
  });
}

/** Distinct user-context count across a set of entries (the header counter). */
export function countContexts(entries: readonly JournalEntryView[]): number {
  return new Set(entries.flatMap((e) => e.contextSlugs)).size;
}

/** The serializable slice of an entry the filter predicate runs on. */
export function toJournalFacet(entry: JournalEntryView): JournalFacet {
  return {
    dateIso: isoDate(entry.date),
    feeling: entry.feeling,
    contextSlugs: entry.contextSlugs,
    hasStory: entry.body !== null && entry.body.length > 0,
    hasWords: entry.heardWords.length > 0,
  };
}

/** Apply the active filters to a full entry list (server side). */
export function filterEntries(
  entries: readonly JournalEntryView[],
  filters: JournalFilters,
  now: Date = new Date(),
): JournalEntryView[] {
  return entries.filter((e) => matchesJournalFilters(toJournalFacet(e), filters, now));
}

/* ---------------------------------------------------------------------------
   Natural-time grouping: This week / Last week / This month / then by month.
   Weeks start on Monday (one convention for both locales). Named buckets are
   labelled from messages; month buckets via the canonical "month" preset.
--------------------------------------------------------------------------- */
export type JournalGroup = {
  key: string;
  kind: "thisWeek" | "lastWeek" | "thisMonth" | "month";
  /** First day of the bucket's month — set only for "month" groups. */
  monthDate?: Date;
  entries: JournalEntryView[];
};

/** Group entries (already sorted newest-first) into natural-time buckets. */
export function groupEntries(
  entries: readonly JournalEntryView[],
  now: Date = new Date(),
): JournalGroup[] {
  const weekStart = startOfWeekUTC(now).getTime();
  const lastWeekStart = subDaysUTC(startOfWeekUTC(now), 7).getTime();
  const monthStart = startOfMonthUTC(now).getTime();

  const groups: JournalGroup[] = [];
  for (const entry of entries) {
    const t = entry.date.getTime();
    let kind: JournalGroup["kind"];
    let key: string;
    let monthDate: Date | undefined;

    if (t >= weekStart) {
      kind = key = "thisWeek";
    } else if (t >= lastWeekStart) {
      kind = key = "lastWeek";
    } else if (t >= monthStart) {
      kind = key = "thisMonth";
    } else {
      kind = "month";
      monthDate = startOfMonthUTC(entry.date);
      key = isoDate(monthDate).slice(0, 7);
    }

    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(entry);
    else groups.push({ key, kind, monthDate, entries: [entry] });
  }
  return groups;
}
