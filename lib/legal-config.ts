/* ===========================================================================
   Facts rendered into the legal pages that cannot be derived from the code.

   They live here, in one place, rather than being spelled out in both locale
   files: the legal copy carries `{publisher}` / `{contactEmail}` / `{dbRegion}`
   tokens that LegalDocument substitutes at render time, so a change lands in
   one file instead of six documents.

   Anything still marked TODO renders visibly as "TODO: …" on a public page.
   That is deliberate — an unfinished legal notice should be embarrassing, not
   invisible. Fill these in before the pages go live.

   `publisher` and `contactEmail` were filled on 2026-08-14. Keep the guarantee
   that made them fillable: never let a value here degrade to an empty string,
   because an empty publisher reads as a finished page that names nobody, which
   is worse than a visible TODO.
=========================================================================== */

import type { Locale } from "@/i18n/routing";

export const LEGAL = {
  /** Publisher shown in the legal notice and named as data controller. */
  publisher: "Paul Verdure",

  /** Contact address for questions, privacy requests and security reports. */
  contactEmail: "paul.verdure@gmail.com",

  /**
   * Region of the Supabase project holding the database and auth records.
   * Read from the pooler host in DATABASE_URL (aws-1-eu-central-1 → Frankfurt).
   * A place name reads as copy, so it carries a translation; the fact it
   * states still lives here, in one place, and not in the message catalogs.
   * Update both sides if the project is ever moved.
   */
  dbRegion: {
    en: "Frankfurt, Germany (EU)",
    fr: "Francfort, en Allemagne (UE)",
  },

  /** Date the documents were last substantively changed, ISO 8601. */
  updatedAt: "2026-08-14",
} as const;

/** Tokens the legal copy may reference, resolved once per render. */
export function legalTokens(locale: Locale) {
  return {
    publisher: LEGAL.publisher,
    contactEmail: LEGAL.contactEmail,
    dbRegion: LEGAL.dbRegion[locale],
  };
}
