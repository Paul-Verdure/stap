-- CreateTable
CREATE TABLE "game_plays" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "game_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_plays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_plays_user_id_date_game_id_key" ON "game_plays"("user_id", "date", "game_id");

-- AddForeignKey
ALTER TABLE "game_plays" ADD CONSTRAINT "game_plays_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security — user-owned, owner-only full CRUD (matches the
-- 20260519102255_rls_policies pattern). The anon / authenticated / service_role
-- roles and auth.uid() are created/stubbed by that earlier migration, which the
-- shadow DB replays first, so no preamble is needed here.
ALTER TABLE "game_plays" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "game_plays" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "game_plays" TO authenticated;
CREATE POLICY "game_plays_owner_all"
  ON "game_plays" FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
