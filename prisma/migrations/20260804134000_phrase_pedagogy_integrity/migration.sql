-- Phase H — integrity rules for the per-phrase pedagogical content.
--
-- Hand-written: neither of these can be expressed in the Prisma schema, so
-- `migrate dev` would never generate them.
--
-- This is the third and last step of the pedagogy sequence. The columns had to
-- arrive nullable (`add_phrase_pedagogy`) because the catalog already held
-- rows that could not satisfy NOT NULL until `pnpm db:seed` backfilled them;
-- `phrase_pedagogy_not_null` then tightened situation_en / situation_fr. On an
-- empty database the three apply back to back with nothing to backfill, so the
-- history stays replayable.

-- 1. Scalar lists. Prisma maps String[] to TEXT[] and leaves the column
--    nullable even though the client type is non-optional: a NULL array would
--    be readable as `null` where the app expects `string[]`. Every phrase
--    carries tips, so the database should say so.
ALTER TABLE "phrases" ALTER COLUMN "tips_en" SET NOT NULL,
ALTER COLUMN "tips_fr" SET NOT NULL;

-- 2. The likely reply is optional as a whole but never half-present: rendering
--    Dutch with no translation (or the reverse) is worse than rendering
--    nothing. The seed writes the trio together; this makes it structural.
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_reply_complete"
  CHECK (num_nonnulls("reply_nl", "reply_meaning_en", "reply_meaning_fr") IN (0, 3));
