/*
  Warnings:

  - Made the column `situation_en` on table `phrases` required. This step will fail if there are existing NULL values in that column.
  - Made the column `situation_fr` on table `phrases` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "phrases" ALTER COLUMN "situation_en" SET NOT NULL,
ALTER COLUMN "situation_fr" SET NOT NULL;
