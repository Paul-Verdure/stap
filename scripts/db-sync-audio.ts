// Catalog audio sync — `pnpm db:sync-audio`.
// Uploads the local clips to the Supabase Storage bucket `phrase-audio`
// (upsert, so re-runnable) and points the matching column at the storage path:
//
//   audio/<slug>.mp3          →  <slug>.mp3          →  phrases.audio_url
//   audio/replies/<slug>.mp3  →  replies/<slug>.mp3  →  phrases.reply_audio_url
//
// Both families are keyed by the phrase slug; a reply has no slug of its own.
//
// Files whose slug does not match an existing phrase are skipped with a
// warning. Phrases with no matching file keep a null column — this script
// never NULLs one, even if the file disappears locally. Removing audio is an
// explicit operation, not a side effect.
//
// Runs through the service-role admin client (RLS bypass, storage write).
// dotenv/config: a standalone tsx script does not auto-load .env.
// node-websocket: Node 20 has no global WebSocket, without which merely
// constructing the admin client throws. Must be imported before it.
import "dotenv/config";
import "./node-websocket";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { db } from "../lib/db";
import { createAdminClient } from "../lib/supabase/admin";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(HERE, "..", "prisma", "seed-data", "audio");
const REPLY_DIR = path.join(AUDIO_DIR, "replies");
const BUCKET = "phrase-audio";

/** The two clip families, differing only in where they live and what they set. */
const FAMILIES = [
  {
    label: "phrase",
    dir: AUDIO_DIR,
    // Storage path mirrors the local layout: flat for phrases, prefixed for
    // replies, so the bucket is browsable and the two never collide.
    storagePath: (slug: string) => `${slug}.mp3`,
    column: "audioUrl" as const,
  },
  {
    label: "reply",
    dir: REPLY_DIR,
    storagePath: (slug: string) => `replies/${slug}.mp3`,
    column: "replyAudioUrl" as const,
  },
];

function mp3sIn(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".mp3"));
}

async function main() {
  if (!fs.existsSync(AUDIO_DIR)) {
    throw new Error(
      `Audio source dir missing: ${path.relative(process.cwd(), AUDIO_DIR)}`,
    );
  }

  if (FAMILIES.every((f) => mp3sIn(f.dir).length === 0)) {
    console.log(
      "No audio files in prisma/seed-data/audio/ — nothing to sync.\n" +
        "Run `pnpm audio:generate` first.",
    );
    return;
  }

  // Cross-check: which slugs exist as phrases?
  const phraseSlugs = new Set(
    (await db.phrase.findMany({ select: { slug: true } })).map((p) => p.slug),
  );

  const admin = createAdminClient();
  const totals: string[] = [];
  let skipped = 0;

  for (const family of FAMILIES) {
    const files = mp3sIn(family.dir);
    let uploaded = 0;
    let updated = 0;

    for (const file of files) {
      const slug = file.replace(/\.mp3$/i, "");
      if (!phraseSlugs.has(slug)) {
        console.warn(
          `  ⚠ ${family.label} ${file}: no phrase with slug "${slug}", skipped`,
        );
        skipped++;
        continue;
      }

      const buf = fs.readFileSync(path.join(family.dir, file));
      const storagePath = family.storagePath(slug);

      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(storagePath, buf, {
          contentType: "audio/mpeg",
          upsert: true,
        });
      if (upErr) {
        console.error(`  ✗ ${storagePath}: upload failed: ${upErr.message}`);
        continue;
      }
      uploaded++;

      const res = await db.phrase.updateMany({
        where: { slug },
        data: { [family.column]: storagePath },
      });
      if (res.count > 0) updated++;
    }

    totals.push(
      `  ${family.label.padEnd(7)} uploaded ${String(uploaded).padStart(3)}, ` +
        `${family.column} set ${String(updated).padStart(3)}`,
    );
  }

  console.log("\nAudio sync complete:");
  for (const line of totals) console.log(line);
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
