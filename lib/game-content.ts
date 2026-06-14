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
