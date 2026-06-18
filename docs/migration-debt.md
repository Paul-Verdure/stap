# Migration debt — schema changes blocked by the prisma-CLI quarantine

> **UPDATE 2026-06-18 (G9): quarantine appears RESOLVED.** The prisma CLI runs
> again (`migrate dev` / `generate` succeed; no Defender detections after
> Jun 11). G9 front-loaded **all four** deferred migrations while the window is
> open: `add_game_plays`, `add_user_preferences`, `add_user_soft_delete`,
> `add_push_subscriptions` (the new G9 push table). Each is **applied** and the
> client is regenerated. What remains per item below is the **application-code
> swap** (localStorage → DB) + backfill, done in the same G9 phase; once that
> lands, this file can be deleted. If the CLI re-quarantines, do not fight it.

**Why this file exists.** Since **2026-06-11**, Microsoft Defender for Endpoint
quarantines `node_modules/prisma/build/index.js` (the prisma **7.8.0** CLI
bundle) as `Trojan:JS/ShaiWorm.DBA!MTB`. Diagnosed a **false positive** with
high confidence (clean tarball, sha512 triple-match, no worm IoCs); reported to
Pon IT. Defender now **removes the file silently** — only
`ls node_modules/prisma/build/index.js` is authoritative (a clean
`mdatp threat list` does not mean it is fixed).

**Consequence.** `pnpm exec prisma generate` and `pnpm exec prisma migrate`
fail `MODULE_NOT_FOUND`. We **cannot create or apply migrations, nor regenerate
the client**, while the quarantine is active. The runtime client in
`lib/generated/prisma` is therefore frozen at the **last applied migration**:

- `prisma/migrations/20260605000000_validation_feeling_and_journal`

Everything that would normally be a schema change is being shipped with a
**client-side / no-column workaround** and recorded below. When the quarantine
lifts, work through this list: write the migrations, regenerate the client,
backfill any data parked in `localStorage`, then delete the workaround.

> Runtime is unaffected: dev, `tsc`, `eslint`, prod build, and Vercel deploys
> all work — only the **CLI** (generate/migrate) is blocked. The app connects
> via the driver adapter (`@prisma/adapter-pg`, `lib/db.ts`), not the CLI.

---

## How to verify the quarantine status (first action each session)

```sh
ls node_modules/prisma/build/index.js   # absent => still quarantined
```

If present again, the unblock procedure is:

1. `export PATH=~/.nvm/versions/node/v20.19.3/bin:$PATH`
2. `pnpm exec prisma generate` (regenerate the frozen client)
3. For each deferred item below: add the columns/models to
   `prisma/schema.prisma`, `pnpm exec prisma migrate dev --name <name>`.
4. Backfill data parked in `localStorage` (see each item).
5. Replace the client-side workaround with the real persistence; remove the
   debt note.
6. `tsc` + `eslint` + prod build; commit.

Do **not** fight the quarantine while active: do not re-copy the file, loop
`pnpm install`, or add local Defender exclusions (each install recreates the
bundle → a new tenant detection). Just ship the workaround.

---

## Deferred migrations (write these once unblocked)

### 1. `game_plays` table — G7 "already played" game state

- **Owner phase:** G7 (Games).
- **Current workaround:** per-day played state lives in `localStorage`
  (`lib/game-progress.ts`, per-day key). Resets are client-only; nothing
  persists across devices.
- **Migration to write:** a `GamePlay` model keyed by `(userId, date, gameId)`
  recording which of the three daily games the user has played, RLS-scoped to
  `userId` like every other table.
- **Backfill:** none required — played state is ephemeral (daily reset), so
  starting empty after the migration is acceptable. Optionally drop the
  `localStorage` key on first authenticated load.

### 2. Preferences columns — G8 Notifications + Sound & audio toggles

- **Owner phase:** G8 (Profile), step 4 (Preferences). Decided with the user
  on 2026-06-15: persist in `localStorage`, noted as debt (matches the G7
  played-state precedent).
- **Current workaround:** the two preference toggles persist client-side in
  `localStorage`; there is **no DB column** for them. Dark mode is **not** part
  of this debt — it already persists client-side via `useTheme` (no column was
  ever intended).
- **Migration to write:** add nullable preference columns to `User`
  (e.g. `notificationsEnabled Boolean?`, `soundEnabled Boolean?`) — or a single
  `preferences Json?` blob if more toggles are expected. Keep them nullable so
  existing rows need no backfill default.
- **Backfill:** read each user's `localStorage` value on next authenticated
  load and write it through a server action once; then read from the DB.
- **Note on the Notifications toggle:** option (b) in the G8 decision was to map
  Notifications onto the existing `reminderTime` column (null/non-null). We did
  **not** take that path — the toggle is independent in `localStorage` — so the
  real migration should add a dedicated column rather than overload
  `reminderTime`.

### 3. Account soft-delete column — G8 Delete-account (NOT taken)

- **Owner phase:** G8 (Profile), steps 5 & 7 (Delete account). Decided with the
  user on 2026-06-15: build the full delete UI + `ConfirmInput` + localized-word
  validation but **stub the final destructive call**. Soft-delete (option c) was
  **explicitly ruled out because it needs a migration** that the quarantine
  blocks.
- **Current workaround:** the destructive server action is stubbed/guarded — no
  row is deleted, no `deletedAt` is set, no Supabase **service-role** secret is
  handled. Nothing irreversible runs (this also protects the shared seed user
  `g2-shell-test@example.com`).
- **Migration to write (only if we choose soft-delete over hard-delete):** add
  `deletedAt DateTime?` to `User` and filter it out of every authenticated read.
  Alternatively, real deletion stays a hard-delete via the Supabase admin API +
  DB cascade and needs **no** migration — just the service-role secret and the
  user's explicit go-ahead (a security stop, not a migration).

---

## Not debt (recorded so they are not mistaken for blocked migrations)

- **Schema is otherwise current.** No *desired* schema change other than the
  three items above is pending. G8's editable "My setup" (level, life contexts,
  frequency + reminder, interface language) writes **existing** columns added by
  `20260602075757_onboarding_profile_fields` — no migration needed.
- **Catalog audio not synced** (all `audioUrl` null) is a content/admin task,
  not a migration.
