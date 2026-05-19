-- Phase B — Row Level Security.
--
-- Security model:
--   * Prisma connects as the table owner (postgres) and BYPASSES RLS BY
--     DESIGN. Server-side Prisma access is trusted; RLS guards CLIENT access
--     via @supabase/ssr (anon / authenticated roles).
--   * FORCE ROW LEVEL SECURITY is intentionally NOT used: it would subject
--     the owner (Prisma) to the policies and break server-side access.
--   * service_role bypasses RLS (admin / seed, server-side only).
--   * anon (not logged in) gets NO privileges at all: "public authenticated
--     read" means you must be logged in for anything, catalog included.
--
-- Defensive grants: Supabase commonly sets ALTER DEFAULT PRIVILEGES so that
-- tables created by `postgres` are auto-granted to anon/authenticated. To make
-- the intended access deterministic, every table is REVOKEd from anon and
-- authenticated first, then GRANTed precisely to authenticated only.
--
-- auth.uid() returns the JWT subject as uuid; id / user_id columns are uuid,
-- so no cast is needed. (SELECT auth.uid()) is wrapped in a subselect so the
-- planner evaluates it once per query, not once per row (Supabase perf
-- guidance).

-- ---------------------------------------------------------------------------
-- Shadow-safe preamble. `prisma migrate dev` replays the whole history in an
-- empty shadow database that lacks Supabase internals (the auth schema,
-- auth.uid(), the anon/authenticated/service_role roles, _prisma_migrations).
-- These guards are NO-OPS on the real Supabase database (everything already
-- exists) and only provide the missing scaffolding in the shadow DB so the
-- migration validates. Without this, every future `migrate dev` would fail.
-- ---------------------------------------------------------------------------

DO $do$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$do$;

CREATE SCHEMA IF NOT EXISTS auth;

-- Stub auth.uid() ONLY if absent. On real Supabase the genuine function
-- already exists and is left untouched (no CREATE OR REPLACE).
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE 'CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULL::uuid $f$';
  END IF;
END
$do$;

GRANT USAGE ON SCHEMA public TO authenticated;

-- Prisma's own migration bookkeeping must never be client-reachable.
-- Guarded: the table does not exist in the shadow DB.
DO $do$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
  ) THEN
    EXECUTE 'REVOKE ALL ON "_prisma_migrations" FROM anon, authenticated';
  END IF;
END
$do$;

-- ===========================================================================
-- Catalog: shared, authenticated READ-ONLY. No write grant and no write
-- policy => client writes are impossible. Catalog is populated server-side
-- (Prisma / service_role), which bypasses RLS.
-- ===========================================================================

ALTER TABLE "phrases"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contexts"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phrase_contexts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "phrases"         FROM anon, authenticated;
REVOKE ALL ON "contexts"        FROM anon, authenticated;
REVOKE ALL ON "phrase_contexts" FROM anon, authenticated;

GRANT SELECT ON "phrases"         TO authenticated;
GRANT SELECT ON "contexts"        TO authenticated;
GRANT SELECT ON "phrase_contexts" TO authenticated;

CREATE POLICY "phrases_select_authenticated"
  ON "phrases" FOR SELECT TO authenticated USING (true);
CREATE POLICY "contexts_select_authenticated"
  ON "contexts" FOR SELECT TO authenticated USING (true);
CREATE POLICY "phrase_contexts_select_authenticated"
  ON "phrase_contexts" FOR SELECT TO authenticated USING (true);

-- ===========================================================================
-- users: mirror of auth.users. A user may read/update only their own row.
-- INSERT is done by the Phase D trigger (security definer), never the client.
-- DELETE cascades from auth.users / is a service_role operation.
-- ===========================================================================

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "users" FROM anon, authenticated;
GRANT SELECT, UPDATE ON "users" TO authenticated;

CREATE POLICY "users_select_own"
  ON "users" FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "users_update_own"
  ON "users" FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ===========================================================================
-- User-owned: owner-only full CRUD. One FOR ALL policy per table — USING
-- covers SELECT/UPDATE/DELETE, WITH CHECK covers INSERT/UPDATE.
-- ===========================================================================

ALTER TABLE "challenges" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "challenges" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "challenges" TO authenticated;
CREATE POLICY "challenges_owner_all"
  ON "challenges" FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE "vocabulary_cards" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "vocabulary_cards" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "vocabulary_cards" TO authenticated;
CREATE POLICY "vocabulary_cards_owner_all"
  ON "vocabulary_cards" FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE "daily_activities" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "daily_activities" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "daily_activities" TO authenticated;
CREATE POLICY "daily_activities_owner_all"
  ON "daily_activities" FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE "seasonal_reviews" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "seasonal_reviews" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "seasonal_reviews" TO authenticated;
CREATE POLICY "seasonal_reviews_owner_all"
  ON "seasonal_reviews" FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- journal_entries — strictest: owner-only, no sharing path exists anywhere.
ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "journal_entries" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "journal_entries" TO authenticated;
CREATE POLICY "journal_entries_owner_all"
  ON "journal_entries" FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
