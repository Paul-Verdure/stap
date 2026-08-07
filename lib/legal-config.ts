/* ===========================================================================
   Facts rendered into the legal pages that cannot be derived from the code.

   They live here, in one place, rather than being spelled out in both locale
   files: the legal copy carries `{publisher}` / `{contactEmail}` / `{dbRegion}`
   tokens that LegalDocument substitutes at render time, so a change lands in
   one file instead of six documents.

   Anything still marked TODO renders visibly as "TODO: …" on a public page.
   That is deliberate — an unfinished legal notice should be embarrassing, not
   invisible. Fill these in before the pages go live.
=========================================================================== */

import type { Locale } from "@/i18n/routing";

export const LEGAL = {
  /** Publisher shown in the legal notice and named as data controller. */
  publisher: "TODO: publisher name",

  /** Contact address for questions, privacy requests and security reports. */
  contactEmail: "TODO: contact email",

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
  updatedAt: "2026-08-07",
} as const;

/** Tokens the legal copy may reference, resolved once per render. */
export function legalTokens(locale: Locale) {
  return {
    publisher: LEGAL.publisher,
    contactEmail: LEGAL.contactEmail,
    dbRegion: LEGAL.dbRegion[locale],
  };
}
