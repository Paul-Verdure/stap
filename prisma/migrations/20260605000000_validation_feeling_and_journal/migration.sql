-- Phase G5 — validation feeling + journal link.
-- All target tables/enums already exist (created by earlier migrations), so
-- this is replay-safe in the migrate-dev shadow database with no preamble.

-- No-chance day = the rhythm "skip" cell.
ALTER TYPE "ChallengeState" ADD VALUE 'SKIPPED';

-- How an attempt felt (drives the rhythm vocabulary). "MISSED" is a feeling,
-- never "failed".
CREATE TYPE "Feeling" AS ENUM ('AT_EASE', 'HESITANT', 'MISSED');

-- Feeling captured at validation.
ALTER TABLE "challenges" ADD COLUMN "feeling" "Feeling";

-- Journal entry: one per validated challenge; optional story + free-text heard
-- words; photo path reserved for a later storage pass.
ALTER TABLE "journal_entries"
  ADD COLUMN "challenge_id" TEXT NOT NULL,
  ADD COLUMN "heard_words" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "photo_path" TEXT,
  ALTER COLUMN "body" DROP NOT NULL;

CREATE UNIQUE INDEX "journal_entries_challenge_id_key" ON "journal_entries"("challenge_id");

ALTER TABLE "journal_entries"
  ADD CONSTRAINT "journal_entries_challenge_id_fkey"
  FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
