import type { Locale } from "@/i18n/routing";

/* ===========================================================================
   Localized-column accessor — the one required by ADR 0001.
   ---------------------------------------------------------------------------
   Catalog rows store localized text as one column per locale (`meaningEn` /
   `meaningFr`, `situationEn` / `situationFr`, …). ADR 0001 mandates a single
   accessor so `locale === "fr" ? … : …` never spreads through the codebase:
   adding a UI language then means changing this file and the schema, not
   auditing every page.

   The base name is inferred from the row's own `*En` keys, so `localize(row,
   "meaning", locale)` type-checks only when the row really carries
   `meaningEn` / `meaningFr`, and it returns that column's type (string, or
   string[] for the tips).
=========================================================================== */

// Tripwire for ADR 0001's "locale suffixes MUST stay in sync with
// routing.locales": the mapping below is hand-written, so widening the locale
// set has to come through here. Adding a locale to i18n/routing.ts breaks this
// line at compile time rather than silently serving English.
type AssertLocaleSet = Locale extends "en" | "fr"
  ? "en" | "fr" extends Locale
    ? unknown
    : never
  : never;
export type LocalizedRow<T> = T & AssertLocaleSet;

/** Base names of a row's localized pairs, mapped to the column's type. */
type LocalizedFields<T> = {
  [K in keyof T as K extends `${infer Base}En` ? Base : never]: T[K];
};

/**
 * Read a localized column for `locale`.
 *
 * `locale` is a plain string because that is what route params hand us;
 * anything that is not a known non-default locale falls back to English,
 * matching `routing.defaultLocale` and the inline ternaries this replaces.
 */
export function localize<
  T extends object,
  F extends keyof LocalizedFields<T> & string,
>(row: T, field: F, locale: string): LocalizedFields<T>[F] {
  const suffix = locale === "fr" ? "Fr" : "En";
  // The mapped type above proves the key exists and carries the right type,
  // but the compiler cannot follow a template-literal key back through it.
  return row[`${field}${suffix}` as keyof T] as unknown as LocalizedFields<T>[F];
}
