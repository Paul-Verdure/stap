-- CreateEnum
CREATE TYPE "Register" AS ENUM ('INFORMAL', 'NEUTRAL', 'FORMAL');

-- AlterTable
ALTER TABLE "phrases" ADD COLUMN     "register" "Register" NOT NULL DEFAULT 'NEUTRAL',
ADD COLUMN     "reply_meaning_en" TEXT,
ADD COLUMN     "reply_meaning_fr" TEXT,
ADD COLUMN     "reply_nl" TEXT,
ADD COLUMN     "situation_en" TEXT,
ADD COLUMN     "situation_fr" TEXT,
ADD COLUMN     "tips_en" TEXT[],
ADD COLUMN     "tips_fr" TEXT[];
