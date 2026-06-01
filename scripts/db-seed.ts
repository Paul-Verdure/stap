// Catalog seed — `pnpm db:seed`.
// Reads the three JSON sources in prisma/seed-data/ and idempotently
// populates the shared catalog: themes, life contexts, phrases, plus the
// two M2M join tables (phrase_themes, phrase_life_contexts). The JSON is
// authoritative — re-running fully resyncs.
//
// Runs through Prisma (server role) which bypasses RLS by design.
// dotenv/config: a standalone tsx script does not auto-load .env.
import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { db } from "../lib/db";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(HERE, "..", "prisma", "seed-data");

type LocalizedCatalog = {
  slug: string;
  nameEn: string;
  nameFr: string;
  descriptionEn: string;
  descriptionFr: string;
};

type PhraseSeed = {
  slug: string;
  textNl: string;
  ipa: string;
  level: "A0" | "A1" | "A2" | "B1" | "B2";
  phoneticEn: string;
  phoneticFr: string;
  meaningEn: string;
  meaningFr: string;
  themes: string[];
  lifeContexts: string[];
};

function loadJson<T>(name: string): T {
  const file = path.join(SEED_DIR, name);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Seed file missing: ${path.relative(process.cwd(), file)}`,
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

async function main() {
  const themes = loadJson<LocalizedCatalog[]>("themes.json");
  const lifeContexts = loadJson<LocalizedCatalog[]>("life-contexts.json");
  const phrases = loadJson<PhraseSeed[]>("phrases.json");

  // Referential-integrity pre-check: fail fast with a clear error rather
  // than mid-loop with a confusing Prisma error.
  const themeSlugs = new Set(themes.map((t) => t.slug));
  const lifeSlugs = new Set(lifeContexts.map((l) => l.slug));
  for (const p of phrases) {
    for (const s of p.themes) {
      if (!themeSlugs.has(s)) {
        throw new Error(
          `phrases.json: "${p.slug}" references unknown theme "${s}"`,
        );
      }
    }
    for (const s of p.lifeContexts ?? []) {
      if (!lifeSlugs.has(s)) {
        throw new Error(
          `phrases.json: "${p.slug}" references unknown life context "${s}"`,
        );
      }
    }
  }

  // --- 1. Themes ---------------------------------------------------------
  for (const t of themes) {
    const payload = {
      nameEn: t.nameEn,
      nameFr: t.nameFr,
      descriptionEn: t.descriptionEn,
      descriptionFr: t.descriptionFr,
    };
    await db.theme.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, ...payload },
      update: payload,
    });
  }

  // --- 2. Life contexts --------------------------------------------------
  for (const lc of lifeContexts) {
    const payload = {
      nameEn: lc.nameEn,
      nameFr: lc.nameFr,
      descriptionEn: lc.descriptionEn,
      descriptionFr: lc.descriptionFr,
    };
    await db.lifeContext.upsert({
      where: { slug: lc.slug },
      create: { slug: lc.slug, ...payload },
      update: payload,
    });
  }

  // --- 3. slug -> id lookups for the join tables -------------------------
  const themeBySlug = new Map(
    (await db.theme.findMany({ select: { id: true, slug: true } })).map(
      (x) => [x.slug, x.id] as const,
    ),
  );
  const lifeBySlug = new Map(
    (
      await db.lifeContext.findMany({ select: { id: true, slug: true } })
    ).map((x) => [x.slug, x.id] as const),
  );

  // --- 4. Phrases + M2M resync ------------------------------------------
  // The JSON is the source of truth: links for a phrase are wiped and
  // recreated, so removing a tag from JSON removes it from the DB.
  let totalThemeLinks = 0;
  let totalLifeLinks = 0;
  for (const p of phrases) {
    const payload = {
      textNl: p.textNl,
      ipa: p.ipa,
      level: p.level,
      phoneticEn: p.phoneticEn,
      phoneticFr: p.phoneticFr,
      meaningEn: p.meaningEn,
      meaningFr: p.meaningFr,
    };
    const phrase = await db.phrase.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...payload },
      update: payload,
    });

    await db.phraseTheme.deleteMany({ where: { phraseId: phrase.id } });
    if (p.themes.length) {
      await db.phraseTheme.createMany({
        data: p.themes.map((s) => ({
          phraseId: phrase.id,
          themeId: themeBySlug.get(s)!,
        })),
      });
      totalThemeLinks += p.themes.length;
    }

    await db.phraseLifeContext.deleteMany({
      where: { phraseId: phrase.id },
    });
    const lcSlugs = p.lifeContexts ?? [];
    if (lcSlugs.length) {
      await db.phraseLifeContext.createMany({
        data: lcSlugs.map((s) => ({
          phraseId: phrase.id,
          lifeContextId: lifeBySlug.get(s)!,
        })),
      });
      totalLifeLinks += lcSlugs.length;
    }
  }

  console.log("Seed complete:");
  console.log(`  themes              : ${themes.length}`);
  console.log(`  life contexts       : ${lifeContexts.length}`);
  console.log(`  phrases             : ${phrases.length}`);
  console.log(`  phrase-theme links  : ${totalThemeLinks}`);
  console.log(`  phrase-life links   : ${totalLifeLinks}`);
}

main()
  .catch((err) => {
    console.error("Seed FAILED:");
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
