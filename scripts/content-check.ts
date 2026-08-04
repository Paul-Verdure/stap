// Catalog lint — `pnpm content:check` (add `--strict` to enforce coverage).
//
// Validates prisma/seed-data/ without touching the database, so it runs in any
// checkout and gates every content pull request. Two tiers:
//
//   integrity : structural rules the catalog can never violate. Always fatal.
//   coverage  : pedagogical volume targets (Phase H). Reported as a table by
//               default, fatal under --strict, so the levels can be filled one
//               pull request at a time without the lint failing meanwhile.
//
// The coverage thresholds are not arbitrary — each mirrors a runtime rule in
// lib/challenge.ts or lib/game-content.ts, noted at its definition below.
import {
  LEVELS,
  loadAudioSlugs,
  loadLifeContexts,
  loadPhrases,
  loadThemes,
  REGISTERS,
  type Level,
  type SourcedPhrase,
} from "./catalog-source";

/* --- Thresholds ---------------------------------------------------------- */

/** Phase H target: every advertised level carries a full catalog. */
const MIN_PER_LEVEL = 40;

/**
 * Worst case a real user can hit: their level band crossed with a SINGLE
 * selected life context. Must comfortably clear REPEAT_WINDOW_DAYS in
 * lib/challenge.ts, or the anti-repeat window empties and the fallback starts
 * serving the same phrase twice.
 */
const MIN_BAND_CONTEXT_POOL = 20;

/**
 * getRelatedPhrases() is called with limit up to 5 (games/fill, games/listen),
 * and it excludes the challenge phrase itself — so a theme needs 6 phrases
 * inside the band or the games quietly drop to fewer rounds.
 */
const MIN_THEME_BAND = 6;

/**
 * buildFillRounds() blanks the last word of a phrase (splitLastWord in
 * lib/game-content.ts). A single-word phrase makes a round whose frame is
 * empty, so the level needs a majority of multi-word phrases.
 */
const MIN_MULTIWORD_RATIO = 0.6;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* --- Reporting ----------------------------------------------------------- */

const integrityErrors: string[] = [];
const coverageErrors: string[] = [];

function integrity(condition: boolean, message: string) {
  if (!condition) integrityErrors.push(message);
}

function coverage(condition: boolean, message: string) {
  if (!condition) coverageErrors.push(message);
}

/** Levels visible to a user at `level` — mirrors bandLevels() in lib/challenge.ts. */
function bandLevels(level: Level): Level[] {
  const i = LEVELS.indexOf(level);
  return LEVELS.slice(Math.max(0, i - 1), i + 1);
}

/* --- Checks -------------------------------------------------------------- */

function checkIntegrity(
  phrases: SourcedPhrase[],
  themeSlugs: Set<string>,
  lifeSlugs: Set<string>,
) {
  const seenSlugs = new Map<string, string>();
  const seenText = new Map<string, string>();

  for (const p of phrases) {
    const at = `${p.sourceFile} "${p.slug}"`;

    // Identity.
    integrity(SLUG_RE.test(p.slug), `${at}: slug is not kebab-case`);
    integrity(
      !seenSlugs.has(p.slug),
      `${at}: duplicate slug (also in ${seenSlugs.get(p.slug)})`,
    );
    seenSlugs.set(p.slug, p.sourceFile);

    const textKey = p.textNl.trim().toLowerCase();
    integrity(
      !seenText.has(textKey),
      `${at}: duplicate textNl "${p.textNl}" (also in ${seenText.get(textKey)})`,
    );
    seenText.set(textKey, p.sourceFile);

    // The file name is authoritative for the level — a mismatch means a phrase
    // was moved without its level being updated, which silently skews pools.
    const fileLevel = p.sourceFile.replace(".json", "").toUpperCase();
    integrity(
      p.level === fileLevel,
      `${at}: level ${p.level} does not match its file (${p.sourceFile})`,
    );

    // Required text, both locales.
    const required: [string, string | undefined][] = [
      ["textNl", p.textNl],
      ["ipa", p.ipa],
      ["phoneticEn", p.phoneticEn],
      ["phoneticFr", p.phoneticFr],
      ["meaningEn", p.meaningEn],
      ["meaningFr", p.meaningFr],
      ["situationEn", p.situationEn],
      ["situationFr", p.situationFr],
    ];
    for (const [field, value] of required) {
      integrity(
        typeof value === "string" && value.trim().length > 0,
        `${at}: ${field} is missing or empty`,
      );
    }

    integrity(
      p.register === undefined || REGISTERS.includes(p.register),
      `${at}: register "${p.register}" is not one of ${REGISTERS.join(" / ")}`,
    );

    // Tips: 2 or 3, non-empty, and the same count in both locales.
    for (const [field, tips] of [
      ["tipsEn", p.tipsEn],
      ["tipsFr", p.tipsFr],
    ] as const) {
      integrity(
        Array.isArray(tips) && tips.length >= 2 && tips.length <= 3,
        `${at}: ${field} must hold 2 or 3 tips (got ${tips?.length ?? 0})`,
      );
      integrity(
        (tips ?? []).every((t) => t.trim().length > 0),
        `${at}: ${field} contains an empty tip`,
      );
    }
    integrity(
      (p.tipsEn?.length ?? 0) === (p.tipsFr?.length ?? 0),
      `${at}: tipsEn and tipsFr have different lengths`,
    );

    // Reply trio, all or nothing — mirrors the phrases_reply_complete CHECK.
    const replyParts = [p.replyNl, p.replyMeaningEn, p.replyMeaningFr];
    const filled = replyParts.filter(
      (v) => typeof v === "string" && v.trim().length > 0,
    ).length;
    integrity(
      filled === 0 || filled === 3,
      `${at}: reply must be fully absent or fully present (${filled}/3 filled)`,
    );

    // Tagging.
    integrity(p.themes.length > 0, `${at}: no theme`);
    for (const s of p.themes) {
      integrity(themeSlugs.has(s), `${at}: unknown theme "${s}"`);
    }
    const contexts = p.lifeContexts ?? [];
    // An untagged phrase can never be chosen: selectPhraseForDay requires a
    // shared life context, and every onboarded user has at least one.
    integrity(
      contexts.length > 0,
      `${at}: no life context — it can never be selected as a daily challenge`,
    );
    for (const s of contexts) {
      integrity(lifeSlugs.has(s), `${at}: unknown life context "${s}"`);
    }
  }
}

function checkCoverage(phrases: SourcedPhrase[], lifeSlugs: Set<string>) {
  for (const level of LEVELS) {
    const atLevel = phrases.filter((p) => p.level === level);

    coverage(
      atLevel.length >= MIN_PER_LEVEL,
      `${level}: ${atLevel.length} phrases, needs ${MIN_PER_LEVEL}`,
    );

    if (atLevel.length > 0) {
      const multiword = atLevel.filter(
        (p) => p.textNl.trim().split(/\s+/).length > 1,
      ).length;
      const ratio = multiword / atLevel.length;
      coverage(
        ratio >= MIN_MULTIWORD_RATIO,
        `${level}: ${Math.round(ratio * 100)}% multi-word phrases, needs ` +
          `${MIN_MULTIWORD_RATIO * 100}% (the Fill game blanks the last word)`,
      );
    }

    // Worst-case selection pool: this band, one single life context.
    const band = bandLevels(level);
    const inBand = phrases.filter((p) => band.includes(p.level));
    for (const ctx of lifeSlugs) {
      const pool = inBand.filter((p) => (p.lifeContexts ?? []).includes(ctx));
      coverage(
        pool.length >= MIN_BAND_CONTEXT_POOL,
        `${level} + "${ctx}" only: pool of ${pool.length}, needs ` +
          `${MIN_BAND_CONTEXT_POOL} to outlast the anti-repeat window`,
      );
    }

    // Theme density inside the band, for the games and the key-words list.
    const themesUsed = new Set(atLevel.flatMap((p) => p.themes));
    for (const theme of themesUsed) {
      const count = inBand.filter((p) => p.themes.includes(theme)).length;
      coverage(
        count >= MIN_THEME_BAND,
        `${level} + theme "${theme}": ${count} phrases in band, needs ` +
          `${MIN_THEME_BAND} to fill the games`,
      );
    }
  }
}

/* --- Coverage table ------------------------------------------------------ */

function printCoverageTable(
  phrases: SourcedPhrase[],
  lifeSlugs: Set<string>,
  audioSlugs: Set<string>,
) {
  const pad = (s: string, n: number) => s.padEnd(n);
  const num = (n: number, n2: number) => String(n).padStart(n2);

  console.log("\nCoverage by level");
  console.log(
    `  ${pad("level", 7)}${pad("phrases", 9)}${pad("multi-word", 12)}` +
      `${pad("worst pool", 12)}audio`,
  );

  for (const level of LEVELS) {
    const atLevel = phrases.filter((p) => p.level === level);
    const band = bandLevels(level);
    const inBand = phrases.filter((p) => band.includes(p.level));

    const worst = lifeSlugs.size
      ? Math.min(
          ...[...lifeSlugs].map(
            (ctx) =>
              inBand.filter((p) => (p.lifeContexts ?? []).includes(ctx)).length,
          ),
        )
      : 0;
    const multiword = atLevel.filter(
      (p) => p.textNl.trim().split(/\s+/).length > 1,
    ).length;
    const pct = atLevel.length
      ? `${Math.round((multiword / atLevel.length) * 100)}%`
      : "—";
    const withAudio = atLevel.filter((p) => audioSlugs.has(p.slug)).length;
    const audioPct = atLevel.length
      ? `${Math.round((withAudio / atLevel.length) * 100)}%`
      : "—";

    console.log(
      `  ${pad(level, 7)}${pad(`${num(atLevel.length, 3)}/${MIN_PER_LEVEL}`, 9)}` +
        `${pad(pct, 12)}${pad(`${num(worst, 3)}/${MIN_BAND_CONTEXT_POOL}`, 12)}${audioPct}`,
    );
  }

  // Audio is tracked, never enforced: the clips are a separate chantier and
  // audio_url is null for the whole catalog today (see docs/roadmap).
  console.log(
    "\n  Audio coverage is informational — syncing clips is a separate chantier.",
  );
}

/* --- Main ---------------------------------------------------------------- */

function main() {
  const strict = process.argv.includes("--strict");

  const themes = loadThemes();
  const lifeContexts = loadLifeContexts();
  const phrases = loadPhrases();

  const themeSlugs = new Set(themes.map((t) => t.slug));
  const lifeSlugs = new Set(lifeContexts.map((l) => l.slug));

  checkIntegrity(phrases, themeSlugs, lifeSlugs);
  checkCoverage(phrases, lifeSlugs);

  console.log(
    `Checked ${phrases.length} phrases, ${themes.length} themes, ` +
      `${lifeContexts.length} life contexts.`,
  );

  if (integrityErrors.length) {
    console.error(`\nIntegrity — ${integrityErrors.length} error(s):`);
    for (const e of integrityErrors) console.error(`  ✗ ${e}`);
  }

  printCoverageTable(phrases, lifeSlugs, loadAudioSlugs());

  if (coverageErrors.length) {
    const label = strict ? "error" : "gap";
    console.log(`\nCoverage — ${coverageErrors.length} ${label}(s):`);
    for (const e of coverageErrors) console.log(`  · ${e}`);
    if (!strict) {
      console.log(
        "\n  Not fatal without --strict: the levels are being filled one " +
          "pull request at a time.",
      );
    }
  }

  const failed = integrityErrors.length > 0 || (strict && coverageErrors.length > 0);
  if (failed) {
    console.error("\nFAILED");
    process.exitCode = 1;
  } else {
    console.log("\nOK");
  }
}

main();
