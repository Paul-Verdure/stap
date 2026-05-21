-- Phase D — Sync auth.users -> public.users.
--
-- A new row in Supabase auth.users (signup) creates a mirror row in
-- public.users; an email change is mirrored; a delete is mirrored too, and
-- from public.users the deletion cascades to every user-owned table
-- (challenges, journal_entries, ...) via the relations declared in
-- schema.prisma (onDelete: Cascade).
--
-- A real cross-schema foreign key (public.users.id REFERENCES auth.users.id)
-- would be a slightly more native alternative, but Prisma 7 only allows it
-- with a full multi-schema setup (datasource.schemas + @@schema on every
-- model + a stub auth_users model). For an identical user-facing outcome we
-- keep schema.prisma minimal and handle deletion with a third trigger.
--
-- The trigger functions are SECURITY DEFINER with an empty search_path: they
-- run as the table owner (postgres) so they bypass RLS when writing to
-- public.users, and they are immune to a search_path hijack — every object
-- reference is schema-qualified.

-- ---------------------------------------------------------------------------
-- Shadow-safe preamble. `prisma migrate dev` replays this migration in an
-- empty shadow database that lacks Supabase internals. The previous RLS
-- migration already creates the auth schema + a stub auth.uid(); here we add
-- a stub auth.users so the trigger and the FK can be created. No-op on the
-- real Supabase database (the genuine auth.users always exists and is left
-- untouched).
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS auth;

-- The CREATE TABLE is gated behind an existence check rather than IF NOT
-- EXISTS: on real Supabase, the auth schema is owned by supabase_auth_admin
-- and the postgres role has no CREATE there, so even an idempotent CREATE
-- TABLE IF NOT EXISTS fails the privilege check before noticing the table
-- already exists. The DO-block guard skips the CREATE entirely when the
-- table is already there (real DB) and only attempts it in the shadow DB,
-- where the postgres role owns the schema.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    EXECUTE 'CREATE TABLE auth.users (id uuid PRIMARY KEY, email text)';
  END IF;
END
$do$;

-- ---------------------------------------------------------------------------
-- INSERT path: create the mirror row.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- updated_at has no DB default (Prisma's @updatedAt is set at the client
  -- level); set it explicitly here so direct SQL inserts work.
  INSERT INTO public.users (id, email, updated_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- UPDATE path: keep the mirrored email in sync. Only writes when the email
-- actually changed so updated_at is not bumped on every auth.users touch.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_auth_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.users
       SET email = NEW.email,
           updated_at = NOW()
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_email_change();

-- ---------------------------------------------------------------------------
-- DELETE path: when a user disappears from auth.users (admin delete, account
-- removal), remove the mirror row in public.users. The deletion then
-- cascades to challenges / vocabulary_cards / journal_entries /
-- daily_activities / seasonal_reviews via the onDelete: Cascade relations
-- declared in schema.prisma.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_deleted_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_deleted
AFTER DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_deleted_auth_user();

-- ---------------------------------------------------------------------------
-- Backfill: Phase C testing already created auth.users rows before the
-- trigger existed. Mirror them now.
-- ---------------------------------------------------------------------------

INSERT INTO public.users (id, email, updated_at)
SELECT id, email, NOW() FROM auth.users
ON CONFLICT (id) DO NOTHING;
