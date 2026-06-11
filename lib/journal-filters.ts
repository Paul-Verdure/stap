import { isoDate, startOfMonthUTC, startOfWeekUTC } from "@/lib/date";

/* ===========================================================================
   Journal filters (G6) — pure, isomorphic filter vocabulary.
   ---------------------------------------------------------------------------
   The filter state lives in the URL (searchParams), so the list stays a
   server component and every filtered view is shareable. This module is the
   single definition of that state: parsing, serializing back to a query, and
   the matching predicate — shared verbatim by the server page and the client
   filter controls (the sheet's live "Apply (N)" count runs the same predicate
   over serializable facets).
=========================================================================== */

export const JOURNAL_FEELINGS = ["at-ease", "hesitant", "missed"] as const;
export type JournalFeeling = (typeof JOURNAL_FEELINGS)[number];

export const JOURNAL_PERIODS = ["all", "week", "month"] as const;
export type JournalPeriod = (typeof JOURNAL_PERIODS)[number];

export const JOURNAL_CONTENTS = ["story", "words"] as const;
export type JournalContent = (typeof JOURNAL_CONTENTS)[number];

export type JournalFilters = {
  feelings: JournalFeeling[];
  contexts: string[];
  period: JournalPeriod;
  content: JournalContent[];
};

export const EMPTY_JOURNAL_FILTERS: JournalFilters = {
  feelings: [],
  contexts: [],
  period: "all",
  content: [],
};

/** What the predicate needs to know about one entry — JSON-serializable. */
export type JournalFacet = {
  /** "YYYY-MM-DD" challenge day (UTC date-only). */
  dateIso: string;
  feeling: JournalFeeling;
  contextSlugs: string[];
  hasStory: boolean;
  hasWords: boolean;
};

type SearchParams = { [key: string]: string | string[] | undefined };

function csv(value: string | string[] | undefined): string[] {
  return typeof value === "string" ? value.split(",").filter(Boolean) : [];
}

function isIn<T extends string>(set: readonly T[]) {
  return (v: string): v is T => (set as readonly string[]).includes(v);
}

/** Read the filter state from a page's searchParams (unknown values drop). */
export function parseJournalFilters(sp: SearchParams): JournalFilters {
  const period = typeof sp.period === "string" ? sp.period : "all";
  return {
    feelings: csv(sp.feel).filter(isIn(JOURNAL_FEELINGS)),
    contexts: csv(sp.ctx),
    period: isIn(JOURNAL_PERIODS)(period) ? period : "all",
    content: csv(sp.has).filter(isIn(JOURNAL_CONTENTS)),
  };
}

/** Serialize back to a query object — empty/default keys are omitted. */
export function journalFiltersQuery(
  filters: JournalFilters,
): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.feelings.length) query.feel = filters.feelings.join(",");
  if (filters.contexts.length) query.ctx = filters.contexts.join(",");
  if (filters.period !== "all") query.period = filters.period;
  if (filters.content.length) query.has = filters.content.join(",");
  return query;
}

export function hasActiveJournalFilters(filters: JournalFilters): boolean {
  return (
    filters.feelings.length > 0 ||
    filters.contexts.length > 0 ||
    filters.period !== "all" ||
    filters.content.length > 0
  );
}

/** Does one entry pass the active filters? (`now` anchors the period.) */
export function matchesJournalFilters(
  facet: JournalFacet,
  filters: JournalFilters,
  now: Date = new Date(),
): boolean {
  if (filters.feelings.length && !filters.feelings.includes(facet.feeling)) {
    return false;
  }
  if (
    filters.contexts.length &&
    !facet.contextSlugs.some((slug) => filters.contexts.includes(slug))
  ) {
    return false;
  }
  if (filters.period !== "all") {
    const start =
      filters.period === "week" ? startOfWeekUTC(now) : startOfMonthUTC(now);
    // ISO date strings compare correctly as strings.
    if (facet.dateIso < isoDate(start)) return false;
  }
  if (filters.content.includes("story") && !facet.hasStory) return false;
  if (filters.content.includes("words") && !facet.hasWords) return false;
  return true;
}
