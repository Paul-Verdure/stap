# Stap — v2 roadmap, follow-ups & deployment

Status after **Phase G9** (cross-cutting polish). This file captures what is
intentionally deferred to v2, the operational follow-ups that are not features,
and the procedure to deploy the app to production.

---

## 1. Planned for v2 (intentionally stubbed)

These surfaces ship in v1 as deliberate stubs (often a "Coming in v2"
placeholder). The data models and routes exist; the experiences do not yet.

| Feature | Where it lives today | v2 scope |
| --- | --- | --- |
| **Journal entry detail** | `/journal/[id]` — stub page | Full entry view: the day's phrase, the felt-rating, free-text story, heard words, and (later) the photo. |
| **Seasonal review** | Profile "My season" card → "Coming in v2" modal; `SeasonalReview` model exists | Quarterly retrospective: generate a stats snapshot per `(user, year, quarter)` and render it as a review screen. |
| **Detailed rhythm view** | Profile "My rhythm" card → "Coming in v2" modal | A richer weekly/seasonal rhythm visualisation beyond the 7-day preview row. |
| **This week's vocabulary** | `/games/review` — stub; home "review link" | A spaced-exposure review of the `VocabularyCard`s the user has met this week. |
| **Catalog audio playback** | `ListenButton`s render but `audioUrl` is null everywhere | Sync the phrase audio (there is a `db:sync-audio` script) so the listen games and pronunciation buttons actually play. This is what makes Stap the "primary pronunciation tool"; it also enables offline audio caching. |

> Product invariants still apply to all of the above: no streaks, amber-only
> palette, "Missed" never "Failed", Dutch always `lang="nl"`. See the Phase G
> planning docs / handoffs for the design contract.

---

## 2. Follow-ups (operational, not features)

Cleanups and decisions left open at G9 close. None block a deploy unless noted.

### Security / data
- **Account deletion is still stubbed.** The `users.deleted_at` column landed
  in G9 (soft-delete path is schema-ready), but `deleteAccount` in
  `lib/account-actions.ts` is a no-op. Wiring it is a **security stop** — choose
  one and implement deliberately:
  - *Soft-delete*: set `deleted_at = now()` and filter it out of every
    authenticated read (reversible, no service-role secret needed).
  - *Hard-delete*: Supabase admin API + service-role key + DB cascade (needs the
    secret; no migration).
  - Never run the real delete on the shared seed user `g2-shell-test@example.com`.
- **Legal pages are gated behind auth.** `PUBLIC_PATHS` in
  `lib/supabase/middleware.ts` does not include `/legal`, so terms / privacy /
  notice require a session even though they are public SSG content. Add `/legal`
  to the whitelist when the real copy is written (app stores and logged-out
  users need to read the privacy policy).

### Content
- **Real legal copy** for `/legal/[doc]` (terms / privacy / notice are
  placeholder text).
- **Version string**: the Profile footer shows the real package version
  (`Stap v0.1.0`). Bump it on release if desired.
- **Localize the design-system gallery** (`/[locale]/design-system`) — currently
  English-only. It is a dev primitives showcase, so this is optional.

### Push robustness (post-v1 hardening)
- **Timezones**: reminder slots are matched in **UTC** (a documented
  simplification in `lib/date.ts`). Real per-user timezones would make the
  reminder fire at the user's local time.
- **Cross-device subscriptions**: `notifications_enabled` is a global column but
  a `PushSubscription` is per-device. A device can show the toggle "on" (from
  the column) without a local subscription. Optional: on mount, if the toggle is
  on and `Notification.permission === "granted"` but no local subscription
  exists, re-subscribe silently.
- **Custom install affordance**: no in-app `beforeinstallprompt` "Install" button
  (the native browser install works). Add one for extra polish if wanted.

### Housekeeping
- `docs/migration-debt.md` can be **deleted** — every item it tracked was
  resolved in G9 (the quarantine lifted and all four migrations landed).

---

## 3. Deployment procedure

**Stack:** Next.js 16 (App Router) on **Vercel**, Postgres on **Supabase**,
Serwist service worker, Web Push (VAPID), hourly Vercel Cron.

### 3.1 Prerequisites
- The repo on GitHub (the `feat/phase-g9-polish` branch is pushed; merge to
  `main` first).
- A Vercel account/project and a Supabase project (Postgres + Auth).
- Node **20.x** and `pnpm@10.33.3` (declared via `packageManager`).

### 3.2 Environment variables
Set these in **Vercel → Project → Settings → Environment Variables** (Production,
and Preview if you want push there too). `.env.example` documents them; values
live only in your local `.env` (gitignored) — never commit secrets.

| Variable | Secret? | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pooled runtime connection (Supavisor, port 6543, `?pgbouncer=true`). |
| `DIRECT_URL` | yes | Direct connection (port 5432) for the Prisma CLI / migrations. |
| `NEXT_PUBLIC_SUPABASE_URL` | no | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Admin key (server-only; e.g. future hard-delete). |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | no | Web Push public key (shipped to the client). |
| `VAPID_PRIVATE_KEY` | **yes** | Web Push private key — signs every push. Server-only. |
| `VAPID_SUBJECT` | no | `mailto:` / URL contact for push services. **Replace the `mailto:admin@example.com` placeholder.** |
| `CRON_SECRET` | **yes** | Bearer token protecting `/api/cron/reminders`. Vercel Cron sends it automatically. |

> Without the VAPID keys and `CRON_SECRET`, push and the reminder cron simply
> stay dormant — the build and the rest of the app are unaffected.

### 3.3 Steps
1. **Connect the repo to Vercel.** It auto-detects Next.js and pnpm. Set the
   Node version to **20.x** (Project → Settings → Node.js Version) — the app
   requires Node 20.
2. **Set the environment variables** from the table above.
3. **Build settings (defaults are fine).** Build command `next build`; install
   runs `postinstall` → `prisma generate`. The `onlyBuiltDependencies` allowlist
   in `pnpm-workspace.yaml` (`prisma`, `@prisma/client`, `@prisma/engines`,
   `esbuild`) lets those packages run their build scripts under pnpm — keep that
   file. (The local Microsoft-Defender quarantine of the Prisma CLI does **not**
   affect Vercel — there is no Defender on the build infra.)
4. **Apply database migrations.** This project uses a single Supabase instance,
   so the six migrations are already applied to it. If you point production at a
   **separate** database, apply them first:
   ```sh
   export PATH=~/.nvm/versions/node/v20.19.3/bin:$PATH   # Node 20
   pnpm exec prisma migrate deploy                        # uses DIRECT_URL
   ```
   `prisma migrate deploy` only applies committed migrations (no shadow DB, no
   prompts) — the right command for production. The build never runs migrations.
5. **VAPID / push.** Confirm the three VAPID vars are set and `VAPID_SUBJECT` is
   a real contact. The client subscribes with the public key; the server signs
   sends with the private key.
6. **Cron.** `vercel.json` declares the hourly reminder cron
   (`/api/cron/reminders`, `0 * * * *`). Vercel schedules it automatically and
   calls it with `Authorization: Bearer $CRON_SECRET`, so `CRON_SECRET` must be
   set. The endpoint no-ops if the VAPID keys are missing.
7. **Deploy** (push to `main` or trigger from the Vercel dashboard).

### 3.4 Post-deploy verification
- App loads over HTTPS; service worker registers (DevTools → Application).
- **Install**: the browser offers "Install" (omnibox / menu); it opens
  standalone.
- **Offline**: load `/today` once online, go offline, reload — the cached
  challenge renders (not the generic offline page).
- **Push**: on the Profile, toggle Notifications on → grant permission → a
  `push_subscriptions` row is created. Optionally hit the cron endpoint manually
  to confirm delivery:
  ```sh
  curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/reminders
  # => {"sent":N,"pruned":M,"users":K}
  ```
- No console errors; run Lighthouse (PWA / Performance / Accessibility /
  Best-practices) for a final green sweep.
