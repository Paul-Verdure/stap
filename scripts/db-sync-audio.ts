// Catalog audio sync — `pnpm db:sync-audio`.
// Reads prisma/seed-data/audio/<slug>.mp3 files, uploads them to the
// Supabase Storage bucket `phrase-audio` (upsert, so re-runnable), and
// sets phrases.audio_url to the matching storage path.
//
// Files whose slug does not match an existing phrase are skipped with a
// warning. Phrases with no matching audio file keep audio_url = null —
// this script never NULLs an audio_url, even if the file disappears
// locally. Removing audio is an explicit operation, not a side effect.
//
// Runs through the service-role admin client (RLS bypass, storage write).
// dotenv/config: a standalone tsx script does not auto-load .env.
import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { db } from "../lib/db";
import { createAdminClient } from "../lib/supabase/admin";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(HERE, "..", "prisma", "seed-data", "audio");
const BUCKET = "phrase-audio";

async function main() {
  if (!fs.existsSync(AUDIO_DIR)) {
    throw new Error(
      `Audio source dir missing: ${path.relative(process.cwd(), AUDIO_DIR)}`,
    );
  }

  const files = fs
    .readdirSync(AUDIO_DIR)
    .filter((f) => f.toLowerCase().endsWith(".mp3"));

  if (files.length === 0) {
    console.log(
      "No audio files in prisma/seed-data/audio/ — nothing to sync.\n" +
        "Drop <slug>.mp3 files there (one per phrase slug) and re-run.",
    );
    return;
  }

  // Cross-check: which slugs exist as phrases?
  const phraseSlugs = new Set(
    (await db.phrase.findMany({ select: { slug: true } })).map((p) => p.slug),
  );

  const admin = createAdminClient();
  let uploaded = 0;
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const slug = file.replace(/\.mp3$/i, "");
    if (!phraseSlugs.has(slug)) {
      console.warn(`  ⚠ ${file}: no phrase with slug "${slug}", skipped`);
      skipped++;
      continue;
    }

    const buf = fs.readFileSync(path.join(AUDIO_DIR, file));
    const storagePath = `${slug}.mp3`;

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buf, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (upErr) {
      console.error(`  ✗ ${file}: upload failed: ${upErr.message}`);
      continue;
    }
    uploaded++;

    const res = await db.phrase.updateMany({
      where: { slug },
      data: { audioUrl: storagePath },
    });
    if (res.count > 0) updated++;
  }

  console.log("\nAudio sync complete:");
  console.log(`  uploaded                : ${uploaded}`);
  console.log(`  phrases audio_url set   : ${updated}`);
  console.log(`  skipped (no matching slug): ${skipped}`);
}

main()
  .catch((err) => {
    console.error("Audio sync FAILED:");
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
