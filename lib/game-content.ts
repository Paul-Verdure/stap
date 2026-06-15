import { hashToInt } from "@/lib/date";

/* ===========================================================================
   Game content builders (G7) — pure, isomorphic. They turn the day's phrase
   plus its same-theme neighbours into the data each mechanic consumes, with
   deterministic per-day ordering (so a refresh keeps the same layout).
=========================================================================== */

/** One Dutch phrase paired with its localized meaning. */
export type MatchPair = { id: string; nl: string; meaning: string };

/** A single face in the Match grid — one side of a pair. */
export type MatchTile = {
  key: string;
  pairId: string;
  text: string;
  side: "nl" | "meaning";
};

/**
 * Deterministic Fisher–Yates shuffle seeded by an FNV hash chain. Same seed →
 * same order across server and client renders (no hydration mismatch).
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = hashToInt(`${seed}:${i}`) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Explode pairs into 2N shuffled tiles (one NL + one meaning per pair). */
export function buildMatchTiles(pairs: MatchPair[], seed: string): MatchTile[] {
  const tiles = pairs.flatMap((p): MatchTile[] => [
    { key: `${p.id}:nl`, pairId: p.id, text: p.nl, side: "nl" },
    { key: `${p.id}:meaning`, pairId: p.id, text: p.meaning, side: "meaning" },
  ]);
  return seededShuffle(tiles, seed);
}

/* ---------------------------------------------------------------------------
   Game B — "The right word" (Fill). Each round blanks the last word of a
   Dutch phrase; the player picks it back from three options (the answer plus
   two neighbours). Trailing punctuation stays in the frame, so the option is
   a clean word.
--------------------------------------------------------------------------- */

export type FillOption = { word: string; correct: boolean };
export type FillRound = {
  id: string;
  /** Text before the blank (may be empty for a single-word phrase). */
  prefix: string;
  /** Trailing punctuation after the blank (may be empty). */
  suffix: string;
  /** The correct word — shown in the recap chip. */
  answer: string;
  /** Localized meaning, the clue above the frame. */
  clue: string;
  /** Three options, deterministically shuffled. */
  options: FillOption[];
};

const FILL_ROUNDS = 3;
const FILL_OPTIONS = 3;

/** Split a phrase into (prefix, last word, trailing punctuation). */
function splitLastWord(nl: string): {
  prefix: string;
  answer: string;
  suffix: string;
} {
  const m = nl.trim().match(/^(.*?)(\p{L}+)([^\p{L}]*)$/u);
  if (!m) return { prefix: "", answer: nl.trim(), suffix: "" };
  return { prefix: m[1], answer: m[2], suffix: m[3] };
}

/**
 * Build up to three fill rounds from `phrases` (first N become rounds; all of
 * them seed the distractor pool of blanked words). Deterministic per seed.
 */
export function buildFillRounds(
  phrases: MatchPair[],
  seed: string,
): FillRound[] {
  const parsed = phrases.map((p) => ({ ...p, ...splitLastWord(p.nl) }));
  const pool = [...new Set(parsed.map((p) => p.answer))];

  return parsed.slice(0, FILL_ROUNDS).map((p, i) => {
    const distractors = seededShuffle(
      pool.filter((w) => w !== p.answer),
      `${seed}:distractor${i}`,
    ).slice(0, FILL_OPTIONS - 1);

    const options = seededShuffle(
      [
        { word: p.answer, correct: true },
        ...distractors.map((word) => ({ word, correct: false })),
      ],
      `${seed}:option${i}`,
    );

    return {
      id: p.id,
      prefix: p.prefix,
      suffix: p.suffix,
      answer: p.answer,
      clue: p.meaning,
      options,
    };
  });
}

/* ---------------------------------------------------------------------------
   Game C — "A sharp ear" (Listen). Each round plays one phrase; the player
   picks it from three close Dutch variants. The phrase keeps its audio path
   so the disc can play it (currently null for the whole catalog — the game
   renders an honest degraded state, see the listen game component).
--------------------------------------------------------------------------- */

export type ListenSource = {
  id: string;
  nl: string;
  meaning: string;
  audioPath: string | null;
};

export type ListenOption = { word: string; correct: boolean };
export type ListenRound = {
  id: string;
  /** The correct phrase (full Dutch). */
  answer: string;
  /** Localized meaning — the clue shown while audio is unavailable. */
  meaning: string;
  audioPath: string | null;
  /** Three full Dutch variants, deterministically shuffled. */
  options: ListenOption[];
};

const LISTEN_ROUNDS = 3;
const LISTEN_OPTIONS = 3;

/**
 * Build up to three listen rounds from `sources` (first N become rounds; all
 * of them seed the variant pool). Deterministic per seed.
 */
export function buildListenRounds(
  sources: ListenSource[],
  seed: string,
): ListenRound[] {
  const pool = [...new Set(sources.map((s) => s.nl))];

  return sources.slice(0, LISTEN_ROUNDS).map((s, i) => {
    const distractors = seededShuffle(
      pool.filter((w) => w !== s.nl),
      `${seed}:variant${i}`,
    ).slice(0, LISTEN_OPTIONS - 1);

    const options = seededShuffle(
      [
        { word: s.nl, correct: true },
        ...distractors.map((word) => ({ word, correct: false })),
      ],
      `${seed}:option${i}`,
    );

    return {
      id: s.id,
      answer: s.nl,
      meaning: s.meaning,
      audioPath: s.audioPath,
      options,
    };
  });
}
