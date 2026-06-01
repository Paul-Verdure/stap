# 0001 — Localization strategy for DB-stored catalog labels

- Status: Accepted
- Date: 2026-05-19
- Deciders: Project owner
- Supersedes: —
- Superseded by: —

## Context

Stap teaches Dutch to French- and English-speaking users. Some
business/catalog content stored in Postgres is shown to the user in their
**UI language**, which is one of exactly two locales:

- `i18n/routing.ts` declares `locales: ["en", "fr"]`, `defaultLocale: "en"`.
- Dutch (`nl`) is the *learning target*, never a UI language. The comment in
  `i18n/routing.ts` states the locale list is intentionally closed.

Three categories of field exist in the data model:

| Category | Examples | Localized? |
|---|---|---|
| Target content (the Dutch being learned) | `ipa` (source of truth), `audio_url` | No — a single value |
| Localized aids | locale-specific phonetic respelling, challenge titles, context descriptions, prompts | Yes — `en` + `fr` |
| Static UI strings | buttons, labels | Handled by next-intl, not in the DB |

The localization surface in the DB is therefore: a **bounded set of
catalog fields**, in **exactly two locales** that are **product-defining and
structurally stable**, **authored by us via the seed** (not user-generated),
**low volume**, and read on the hot path (the daily challenge fetch).

Three options were considered:

1. **Columns per locale** — `title_en`, `title_fr` on each concerned table.
2. **Separate translations table** — `translations(entity_type, entity_id,
   locale, field, value)`.
3. **JSONB** — `title jsonb` containing `{ "en": "...", "fr": "..." }`.

## Decision

Adopt **option 1 — one column per locale**.

### Naming convention

- Localized text columns: DB column `snake_case` `<field>_en` / `<field>_fr`,
  mapped to `<field>En` / `<field>Fr` (camelCase) in the Prisma model via
  `@map`.
- `en` is listed first (it is `defaultLocale`).
- Both locale columns are `NOT NULL` whenever the content is mandatory: the
  database guarantees that every catalog row carries both translations.
- Non-localized columns keep their bare name (`ipa`, `audio_url`). The
  **absence of a locale suffix means "not localized"** — this is a
  self-documenting schema convention.
- Locale suffixes MUST stay in sync with `routing.locales` in
  `i18n/routing.ts`. That file remains the conceptual single source of truth
  for the locale set; adding a suffix without adding the locale there (or vice
  versa) is a bug.
- Application code never branches on locale inline. A single accessor helper
  (e.g. `localize(row, "title", locale)`) resolves the right column, keeping
  `locale === "fr" ? ... : ...` out of the codebase.

## Consequences

### Positive

- **Full Prisma type safety preserved.** Each localized field is a typed,
  non-nullable column — the primary reason this stack was chosen is not
  sacrificed.
- **DB-level integrity.** `NOT NULL` per locale guarantees no half-translated
  catalog row can exist. This directly supports the roadmap requirement of a
  never-empty, always-consistent DB for instant recruiter demos.
- **Simplest, fastest reads.** No joins, no JSON extraction; optimal on the
  daily-challenge hot path. Trivial to index, seed, and reason about.
- **Trivial RLS.** No extra table or join to secure (relevant for Phase B).
- **Self-documenting.** The presence/absence of a locale suffix encodes
  whether a field is localized.

### Negative / accepted trade-offs

- **Adding a UI language requires a schema migration** (new `_xx` columns +
  backfill). Accepted: Stap is architecturally a two-UI-language product by
  design; adding a UI language would be a deliberate strategic change that
  warrants a migration anyway, not a routine feature.
- **Inline locale branching is tempting.** Mitigated by the mandatory
  `localize()` accessor convention above.
- **Wider tables** on entities with many localized fields. Acceptable at the
  expected catalog volume and field count.

### Rejected alternatives

- **Translations table (EAV):** scales to N dynamic languages we will never
  need, at the cost of joins/aggregation everywhere, loss of Prisma typing,
  app-level integrity checks, and heavier seed/RLS. Over-engineering for two
  stable locales.
- **JSONB:** Postgres-native and flexible, but trades away Prisma type safety
  and per-locale `NOT NULL`, and makes sort/filter by localized value clumsier
  (`title->>'fr'`). Buys N-locale flexibility that is not needed.

## Scope

This ADR governs **catalog/business labels** only. It does not apply to:

- Static UI strings (next-intl message catalogs).
- The Dutch learning content itself (`ipa`, `audio_url`, etc.), which is not
  localized.

Phase A (Prisma modeling) implements this convention on the concerned tables
(`phrases`, `challenges`, contexts, prompts, …).
