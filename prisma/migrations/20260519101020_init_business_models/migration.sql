-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'fr');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('A0', 'A1', 'A2', 'B1', 'B2');

-- CreateEnum
CREATE TYPE "ChallengeState" AS ENUM ('PENDING', 'PREPARED', 'DONE', 'MISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "ui_locale" "Locale" NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phrases" (
    "id" TEXT NOT NULL,
    "text_nl" TEXT NOT NULL,
    "ipa" TEXT NOT NULL,
    "audio_url" TEXT,
    "level" "Level" NOT NULL,
    "phonetic_en" TEXT NOT NULL,
    "phonetic_fr" TEXT NOT NULL,
    "meaning_en" TEXT NOT NULL,
    "meaning_fr" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phrases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contexts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_fr" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_fr" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phrase_contexts" (
    "phrase_id" TEXT NOT NULL,
    "context_id" TEXT NOT NULL,

    CONSTRAINT "phrase_contexts_pkey" PRIMARY KEY ("phrase_id","context_id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "phrase_id" TEXT NOT NULL,
    "state" "ChallengeState" NOT NULL DEFAULT 'PENDING',
    "prepared_at" TIMESTAMP(3),
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_cards" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "phrase_id" TEXT NOT NULL,
    "exposure_count" INTEGER NOT NULL DEFAULT 0,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_activities" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasonal_reviews" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasonal_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contexts_slug_key" ON "contexts"("slug");

-- CreateIndex
CREATE INDEX "phrase_contexts_context_id_idx" ON "phrase_contexts"("context_id");

-- CreateIndex
CREATE INDEX "challenges_phrase_id_idx" ON "challenges"("phrase_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenges_user_id_date_key" ON "challenges"("user_id", "date");

-- CreateIndex
CREATE INDEX "vocabulary_cards_phrase_id_idx" ON "vocabulary_cards"("phrase_id");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_cards_user_id_phrase_id_key" ON "vocabulary_cards"("user_id", "phrase_id");

-- CreateIndex
CREATE INDEX "journal_entries_user_id_idx" ON "journal_entries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_activities_user_id_date_key" ON "daily_activities"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "seasonal_reviews_user_id_year_quarter_key" ON "seasonal_reviews"("user_id", "year", "quarter");

-- AddForeignKey
ALTER TABLE "phrase_contexts" ADD CONSTRAINT "phrase_contexts_phrase_id_fkey" FOREIGN KEY ("phrase_id") REFERENCES "phrases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrase_contexts" ADD CONSTRAINT "phrase_contexts_context_id_fkey" FOREIGN KEY ("context_id") REFERENCES "contexts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_phrase_id_fkey" FOREIGN KEY ("phrase_id") REFERENCES "phrases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_cards" ADD CONSTRAINT "vocabulary_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_cards" ADD CONSTRAINT "vocabulary_cards_phrase_id_fkey" FOREIGN KEY ("phrase_id") REFERENCES "phrases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_activities" ADD CONSTRAINT "daily_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasonal_reviews" ADD CONSTRAINT "seasonal_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
