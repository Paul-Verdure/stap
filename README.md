# Stap

A Dutch-learning Progressive Web App. Step by step — _stap voor stap_.

The UI is available in **English** (default) and **French**; the learning
target language is **Dutch** only.

One real-life challenge a day: a Dutch phrase to actually say to someone,
with the situation to look out for, what to watch in your pronunciation, and
what the other person is likely to say back. No streaks, no scores — a missed
day is "missed", never "failed".

> Status: feature-complete for v1. Onboarding, the daily challenge and its
> preparation/validation flow, the journal, three micro-games, the profile,
> Web Push reminders and the PWA shell are all in place, on a catalog of 226
> reviewed phrases across five levels. See
> [docs/roadmap-and-deployment.md](docs/roadmap-and-deployment.md) for what is
> deliberately deferred to v2 (notably catalog audio).

## Stack

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | Next.js (App Router, Turbopack) | 16.2.4 |
| Language | TypeScript | ^5 |
| UI runtime | React | 19.2.4 |
| Styling | Tailwind CSS v4 (CSS-first, no `tailwind.config`) | ^4 |
| Fonts | Syne + Inter via `next/font` (self-hosted) | — |
| Database ORM | Prisma (driver adapter, Rust-free client) | 7.8.0 |
| Database / Auth | Supabase (PostgreSQL) via `@supabase/ssr` | 0.10.3 |
| PWA | Serwist via `@serwist/turbopack` | 9.5.11 |
| i18n | next-intl (`[locale]` routing) | 4.12.0 |
| Package manager | pnpm | 10.x |
| Deployment target | Vercel | — |

### Design system — "soft brutalism"

Frozen palette and typography, exposed as Tailwind v4 tokens in
`app/globals.css`:

- Colors: `background` `#F5F0E8`, `foreground` `#1A1A1A`, `surface` `#FFFFFF`,
  `accent` `#E8A020`, `muted` `#5A5650`, `border` `#E8E4DC`,
  `destructive` `#B45309`. No other colors.
- Type: Syne (`font-display`, headings/accents) + Inter (`font-sans`, body).
- Visible borders, sharp grid, radius scale 6 / 12 / 16 / 28px.
- Custom utility `border-structural` (1.5px solid foreground).

## Prerequisites

- Node.js 20+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- A Supabase project (for real database/auth — see below)

## Getting started

```bash
pnpm install            # also runs `prisma generate` (postinstall)
cp .env.example .env    # then fill in the Supabase values
pnpm dev                # http://localhost:3000 (redirects to /en)
```

`pnpm dev` runs Turbopack. The service worker is disabled in development by
default; to exercise the PWA, run a production build.

## Environment variables

See `.env.example` for the documented template. All values come from the
Supabase dashboard ("Connect" → Prisma / ORMs).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled connection (Supavisor, port 6543, `?pgbouncer=true`) — app runtime |
| `DIRECT_URL` | Direct connection (port 5432) — Prisma CLI / migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |

`.env` is gitignored; only `.env.example` is committed.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build (Turbopack) |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm content:check` | Validate the seed catalog (add `--strict` to enforce coverage) |
| `pnpm db:seed` | Sync the catalog from `prisma/seed-data/` |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Run a dev migration |
| `pnpm db:push` | Push the schema without a migration |
| `pnpm db:studio` | Open Prisma Studio |

## Project structure

```
app/
  [locale]/            Localized routes (/en, /fr)
    (app)/             Authenticated shell: today/, journal/, games/, profile/
    (public)/          onboarding/, login/, legal/
    ~offline/          PWA offline fallback page
  api/cron/reminders/  Daily Web Push sender (Vercel Cron)
  auth/confirm/        Magic-link target: verifies the OTP, sets the session
  manifest.ts          Web app manifest
  sw.ts                Service worker (Serwist)
  serwist/[path]/      Route handler that bundles & serves the SW
  globals.css          Tailwind v4 + design tokens
components/            ui/, layout/, challenge/, games/, onboarding/, profile/
i18n/                  routing.ts, request.ts, navigation.ts
lib/
  challenge.ts         Daily-challenge selection + weekly rhythm
  challenge-config.ts  Level band, repeat window, derived pool floor (ADR 0002)
  localize.ts          The localized-column accessor required by ADR 0001
  db.ts                Prisma client singleton (pg driver adapter)
  supabase/            client.ts (browser), server.ts (RSC), middleware.ts
messages/              en.json, fr.json
prisma/
  schema.prisma        Business models (see ADR 0001 for localized columns)
  migrations/          Includes hand-written RLS and CHECK constraints
  seed-data/           Catalog sources: themes, life contexts, phrases/<level>.json
scripts/
  catalog-source.ts    Shared reader for the seed JSON
  content-check.ts     Catalog lint (`pnpm content:check`)
  db-seed.ts           Idempotent catalog sync
proxy.ts               Next 16 middleware: next-intl + Supabase session
types/                 Shared TypeScript types
```

## Architecture notes

- **Tailwind v4**: configuration is CSS-first (`@theme`, `@utility` in
  `globals.css`); there is no `tailwind.config.ts`.
- **Prisma 7**: ships no Rust query engine — the runtime connection uses the
  `@prisma/adapter-pg` driver adapter. The generated client lives in
  `lib/generated/prisma` (gitignored, regenerated via `postinstall`).
- **PWA**: `@serwist/turbopack` compiles the service worker with esbuild,
  independently of the Next bundler, so **Turbopack is kept for both dev and
  build** (no `--webpack`). The SW is served from a route handler at
  `/serwist/sw.js`; the offline fallback is `/en/~offline`.
- **The catalog**: phrases live in `prisma/seed-data/phrases/<level>.json`, one
  file per level so a content pull request stays reviewable. `pnpm db:seed` is
  idempotent and treats the JSON as authoritative — re-running fully resyncs,
  including the tag join tables. Slugs are append-only: `Challenge.phraseId` is
  `onDelete: Restrict`, so a phrase someone has already been served can be
  edited or re-tagged but never removed.
- **Challenge selection**: a user is served their own level plus the one below
  (ADR 0002), intersected with their chosen life contexts, then narrowed to
  avoid recent phrases and yesterday's theme. Each narrowing falls back rather
  than leaving a user with nothing. `pnpm content:check` validates the sources
  without a database and enforces the volume the rule needs — it imports the
  runtime's own constants from `lib/challenge-config.ts` so the thresholds
  cannot drift from the behaviour they protect.
- **i18n**: `next-intl` with an always-prefixed `[locale]` segment and
  browser/cookie locale detection. The middleware lives in `proxy.ts`
  (Next 16 renamed `middleware.ts` → `proxy.ts`); next-intl runs first to
  resolve the locale, then Supabase refreshes the session onto the same
  response so neither the locale nor the session is lost.

## Decisions

Architecture decisions with lasting consequences are recorded in
`docs/decisions/`:

| ADR | Decision |
| --- | --- |
| [0001](docs/decisions/0001-i18n-db-strategy.md) | Localized catalog fields use one column per locale (`_en` / `_fr`), read through the `localize()` accessor. |
| [0002](docs/decisions/0002-daily-challenge-level-band.md) | The daily challenge is drawn from a sliding two-level band, not from everything at or below the user's level. |

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, open **Connect** and copy the Prisma connection
   strings into `.env` (`DATABASE_URL`, `DIRECT_URL`) plus the project URL
   and anon key.
3. Define models in `prisma/schema.prisma`, then `pnpm db:migrate`.

## Deployment (Vercel)

The Prisma client is gitignored, so `postinstall` regenerates it during the
Vercel build. Set the four environment variables in the Vercel project
settings. No build flag overrides are required (Turbopack throughout).
