-- CreateEnum
CREATE TYPE "ChallengeFrequency" AS ENUM ('DAILY', 'THREE_PER_WEEK', 'OWN_PACE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "frequency" "ChallengeFrequency",
ADD COLUMN     "level" "Level",
ADD COLUMN     "onboarded_at" TIMESTAMP(3),
ADD COLUMN     "reminder_time" TEXT;

-- CreateTable
CREATE TABLE "user_life_contexts" (
    "user_id" UUID NOT NULL,
    "life_context_id" TEXT NOT NULL,

    CONSTRAINT "user_life_contexts_pkey" PRIMARY KEY ("user_id","life_context_id")
);

-- CreateIndex
CREATE INDEX "user_life_contexts_life_context_id_idx" ON "user_life_contexts"("life_context_id");

-- AddForeignKey
ALTER TABLE "user_life_contexts" ADD CONSTRAINT "user_life_contexts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_life_contexts" ADD CONSTRAINT "user_life_contexts_life_context_id_fkey" FOREIGN KEY ("life_context_id") REFERENCES "life_contexts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- RLS — user_life_contexts is user-owned: owner-only full CRUD, same model as
-- the other user-owned tables (Phase B). Prisma connects as the table owner
-- and bypasses RLS for trusted server-side writes; these policies guard
-- client (@supabase/ssr) access. The anon/authenticated roles and auth.uid()
-- already exist on the real DB and are stubbed in the migrate-dev shadow DB by
-- the earlier rls_policies migration, so no preamble is needed here.
-- ---------------------------------------------------------------------------

ALTER TABLE "user_life_contexts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "user_life_contexts" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_life_contexts" TO authenticated;
CREATE POLICY "user_life_contexts_owner_all"
  ON "user_life_contexts" FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
