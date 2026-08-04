// Shared reader for the JSON catalog sources in prisma/seed-data/.
//
// Two consumers, one definition of what the files contain: `db-seed.ts`
// (writes them to Postgres) and `content-check.ts` (validates them without a
// database). Keeping the types here is what stops the two from drifting.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const SEED_DIR = path.join(HERE, "..", "prisma", "seed-data");
export const PHRASE_DIR = path.join(SEED_DIR, "phrases");
export const AUDIO_DIR = path.join(SEED_DIR, "audio");

/** Levels in ascending order — mirrors the `Level` enum and lib/challenge.ts. */
export const LEVELS = ["A0", "A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];

export const REGISTERS = ["INFORMAL", "NEUTRAL", "FORMAL"] as const;
export type Register = (typeof REGISTERS)[number];

export type LocalizedCatalog = {
  slug: string;
  nameEn: string;
  nameFr: string;
  descriptionEn: string;
  descriptionFr: string;
};

export type PhraseSeed = {
  slug: string;
  textNl: string;
  ipa: string;
  level: Level;
  register?: Register;
  phoneticEn: string;
  phoneticFr: string;
  meaningEn: string;
  meaningFr: string;
  situationEn: string;
  situationFr: string;
  tipsEn: string[];
  tipsFr: string[];
  replyNl?: string;
  replyMeaningEn?: string;
  replyMeaningFr?: string;
  themes: string[];
  lifeContexts?: string[];
};

/** A phrase plus the file it came from — error messages need the filename. */
export type SourcedPhrase = PhraseSeed & { sourceFile: string };

function readJson<T>(file: string): T {
  if (!fs.existsSync(file)) {
    throw new Error(`Seed file missing: ${path.relative(process.cwd(), file)}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function loadThemes(): LocalizedCatalog[] {
  return readJson<LocalizedCatalog[]>(path.join(SEED_DIR, "themes.json"));
}

export function loadLifeContexts(): LocalizedCatalog[] {
  return readJson<LocalizedCatalog[]>(path.join(SEED_DIR, "life-contexts.json"));
}

/**
 * Every phrase, read in level order (a0 → b2). A missing level file is an
 * error rather than an empty level: silently seeding a partial catalog is how
 * a level ends up with no content in production.
 */
export function loadPhrases(): SourcedPhrase[] {
  return LEVELS.flatMap((level) => {
    const name = `${level.toLowerCase()}.json`;
    const rows = readJson<PhraseSeed[]>(path.join(PHRASE_DIR, name));
    return rows.map((row) => ({ ...row, sourceFile: name }));
  });
}

/**
 * Slugs that have a local audio clip waiting in prisma/seed-data/audio/. This
 * is the same `<slug>.mp3` convention `db-sync-audio.ts` uploads from, so it
 * reflects what a sync would actually produce — reported, never enforced.
 */
export function loadAudioSlugs(): Set<string> {
  if (!fs.existsSync(AUDIO_DIR)) return new Set();
  return new Set(
    fs
      .readdirSync(AUDIO_DIR)
      .filter((f) => f.toLowerCase().endsWith(".mp3"))
      .map((f) => f.slice(0, -".mp3".length)),
  );
}
