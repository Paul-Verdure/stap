-- DropForeignKey
ALTER TABLE "phrase_contexts" DROP CONSTRAINT "phrase_contexts_context_id_fkey";

-- DropForeignKey
ALTER TABLE "phrase_contexts" DROP CONSTRAINT "phrase_contexts_phrase_id_fkey";

-- AlterTable
ALTER TABLE "phrases" ADD COLUMN     "slug" TEXT NOT NULL;

-- DropTable
DROP TABLE "contexts";

-- DropTable
DROP TABLE "phrase_contexts";

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_fr" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_fr" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "life_contexts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_fr" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_fr" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "life_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phrase_themes" (
    "phrase_id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,

    CONSTRAINT "phrase_themes_pkey" PRIMARY KEY ("phrase_id","theme_id")
);

-- CreateTable
CREATE TABLE "phrase_life_contexts" (
    "phrase_id" TEXT NOT NULL,
    "life_context_id" TEXT NOT NULL,

    CONSTRAINT "phrase_life_contexts_pkey" PRIMARY KEY ("phrase_id","life_context_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "themes_slug_key" ON "themes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "life_contexts_slug_key" ON "life_contexts"("slug");

-- CreateIndex
CREATE INDEX "phrase_themes_theme_id_idx" ON "phrase_themes"("theme_id");

-- CreateIndex
CREATE INDEX "phrase_life_contexts_life_context_id_idx" ON "phrase_life_contexts"("life_context_id");

-- CreateIndex
CREATE UNIQUE INDEX "phrases_slug_key" ON "phrases"("slug");

-- AddForeignKey
ALTER TABLE "phrase_themes" ADD CONSTRAINT "phrase_themes_phrase_id_fkey" FOREIGN KEY ("phrase_id") REFERENCES "phrases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrase_themes" ADD CONSTRAINT "phrase_themes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrase_life_contexts" ADD CONSTRAINT "phrase_life_contexts_phrase_id_fkey" FOREIGN KEY ("phrase_id") REFERENCES "phrases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrase_life_contexts" ADD CONSTRAINT "phrase_life_contexts_life_context_id_fkey" FOREIGN KEY ("life_context_id") REFERENCES "life_contexts"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- Row Level Security — parity with the Phase B catalog rules. The previous
-- contexts / phrase_contexts tables are gone (DROP TABLE above also dropped
-- their RLS policies and grants); the new themes / life_contexts /
-- phrase_themes / phrase_life_contexts get the same regime: RLS on, anon has
-- no access, authenticated has read-only.
--
-- The shadow-safe preamble is unnecessary here: the anon / authenticated
-- roles and the auth schema are created by the earlier rls_policies
-- migration, which the shadow DB replays before this one.
-- ===========================================================================

ALTER TABLE "themes"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "life_contexts"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phrase_themes"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phrase_life_contexts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "themes"               FROM anon, authenticated;
REVOKE ALL ON "life_contexts"        FROM anon, authenticated;
REVOKE ALL ON "phrase_themes"        FROM anon, authenticated;
REVOKE ALL ON "phrase_life_contexts" FROM anon, authenticated;

GRANT SELECT ON "themes"               TO authenticated;
GRANT SELECT ON "life_contexts"        TO authenticated;
GRANT SELECT ON "phrase_themes"        TO authenticated;
GRANT SELECT ON "phrase_life_contexts" TO authenticated;

CREATE POLICY "themes_select_authenticated"
  ON "themes" FOR SELECT TO authenticated USING (true);
CREATE POLICY "life_contexts_select_authenticated"
  ON "life_contexts" FOR SELECT TO authenticated USING (true);
CREATE POLICY "phrase_themes_select_authenticated"
  ON "phrase_themes" FOR SELECT TO authenticated USING (true);
CREATE POLICY "phrase_life_contexts_select_authenticated"
  ON "phrase_life_contexts" FOR SELECT TO authenticated USING (true);
