# Stap

A Dutch-learning Progressive Web App. Step by step — _stap voor stap_.

The UI is available in **English** (default) and **French**; the learning
target language is **Dutch** only.

> Status: technical scaffolding. No business data model or product UI yet —
> the foundations (framework, design system, database, auth, PWA, i18n) are
> in place.

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
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Run a dev migration |
| `pnpm db:push` | Push the schema without a migration |
| `pnpm db:studio` | Open Prisma Studio |

## Project structure

```
app/
  [locale]/            Localized routes (/en, /fr)
    layout.tsx         Root layout: <html lang>, fonts, providers
    page.tsx           Home (placeholder)
    ~offline/          PWA offline fallback page
  manifest.ts          Web app manifest
  sw.ts                Service worker (Serwist)
  serwist/[path]/      Route handler that bundles & serves the SW
  globals.css          Tailwind v4 + design tokens
components/            ui/ + layout/ (empty for now)
i18n/                  routing.ts, request.ts, navigation.ts
lib/
  db.ts                Prisma client singleton (pg driver adapter)
  supabase/            client.ts (browser), server.ts (RSC), middleware.ts
messages/              en.json, fr.json
prisma/schema.prisma   Datasource + generator only (no models yet)
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
- **i18n**: `next-intl` with an always-prefixed `[locale]` segment and
  browser/cookie locale detection. The middleware lives in `proxy.ts`
  (Next 16 renamed `middleware.ts` → `proxy.ts`); next-intl runs first to
  resolve the locale, then Supabase refreshes the session onto the same
  response so neither the locale nor the session is lost.

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
