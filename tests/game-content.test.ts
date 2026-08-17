import { describe, expect, it } from "vitest";

import {
  buildFillRounds,
  buildListenRounds,
  buildMatchTiles,
  seededShuffle,
  type MatchPair,
} from "@/lib/game-content";

/* The game builders are pure and deterministic per seed, and both properties
   are load-bearing: the same seed must produce the same order on the server
   and on the client or React hydration mismatches, and a refresh must not
   reshuffle the board under the player. */

const pairs: MatchPair[] = [
  { id: "p1", nl: "Dat is vijf euro.", meaning: "That's five euros." },
  { id: "p2", nl: "één", meaning: "One" },
  { id: "p3", nl: "twee", meaning: "Two" },
  { id: "p4", nl: "drie", meaning: "Three" },
];

describe("seededShuffle", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g"];

  it("is a permutation — nothing lost, nothing duplicated", () => {
    expect([...seededShuffle(items, "s")].sort()).toEqual([...items].sort());
  });

  it("gives the same order for the same seed", () => {
    expect(seededShuffle(items, "2026-08-14")).toEqual(
      seededShuffle(items, "2026-08-14"),
    );
  });

  it("gives a different order for a different seed", () => {
    expect(seededShuffle(items, "2026-08-14")).not.toEqual(
      seededShuffle(items, "2026-08-15"),
    );
  });

  it("does not mutate its input", () => {
    const input = [...items];
    seededShuffle(input, "s");
    expect(input).toEqual(items);
  });

  it("handles empty and single-item inputs", () => {
    expect(seededShuffle([], "s")).toEqual([]);
    expect(seededShuffle(["only"], "s")).toEqual(["only"]);
  });
});

describe("buildMatchTiles", () => {
  it("explodes each pair into exactly two tiles, one per side", () => {
    const tiles = buildMatchTiles(pairs, "seed");
    expect(tiles).toHaveLength(pairs.length * 2);
    for (const p of pairs) {
      const own = tiles.filter((t) => t.pairId === p.id);
      expect(own).toHaveLength(2);
      expect(own.map((t) => t.side).sort()).toEqual(["meaning", "nl"]);
    }
  });

  it("keeps every tile key unique", () => {
    const tiles = buildMatchTiles(pairs, "seed");
    expect(new Set(tiles.map((t) => t.key)).size).toBe(tiles.length);
  });

  it("is deterministic per seed", () => {
    expect(buildMatchTiles(pairs, "d1")).toEqual(buildMatchTiles(pairs, "d1"));
  });
});

describe("buildFillRounds", () => {
  it("builds at most three rounds", () => {
    expect(buildFillRounds(pairs, "s")).toHaveLength(3);
    expect(buildFillRounds(pairs.slice(0, 2), "s")).toHaveLength(2);
    expect(buildFillRounds([], "s")).toHaveLength(0);
  });

  it("blanks the last word and keeps trailing punctuation in the frame", () => {
    const [round] = buildFillRounds([pairs[0]], "s");
    expect(round.answer).toBe("euro");
    expect(round.prefix).toBe("Dat is vijf ");
    expect(round.suffix).toBe(".");
    // The frame must reassemble into the original phrase.
    expect(`${round.prefix}${round.answer}${round.suffix}`).toBe(pairs[0].nl);
  });

  it("offers three options with exactly one correct answer", () => {
    for (const round of buildFillRounds(pairs, "s")) {
      expect(round.options).toHaveLength(3);
      expect(round.options.filter((o) => o.correct)).toHaveLength(1);
      expect(round.options.find((o) => o.correct)?.word).toBe(round.answer);
    }
  });

  it("never repeats an option within a round", () => {
    for (const round of buildFillRounds(pairs, "s")) {
      expect(new Set(round.options.map((o) => o.word)).size).toBe(
        round.options.length,
      );
    }
  });

  it("degenerates on a single-word phrase — known gap, see audit F11", () => {
    // A one-word phrase has nothing to blank around, so the round renders an
    // empty frame with no sentence context. Documented rather than asserted as
    // desirable: the fix is to filter the source phrases to multi-word ones.
    const [round] = buildFillRounds([pairs[1]], "s");
    expect(round.answer).toBe("één");
    expect(round.prefix).toBe("");
    expect(round.suffix).toBe("");
  });

  it("is deterministic per seed", () => {
    expect(buildFillRounds(pairs, "d")).toEqual(buildFillRounds(pairs, "d"));
  });
});

describe("buildListenRounds", () => {
  const sources = pairs.map((p) => ({ ...p, audioPath: `${p.id}.mp3` }));

  it("builds at most three rounds and carries the audio path through", () => {
    const rounds = buildListenRounds(sources, "s");
    expect(rounds).toHaveLength(3);
    expect(rounds[0].audioPath).toBe("p1.mp3");
    expect(rounds[0].answer).toBe("Dat is vijf euro.");
  });

  it("offers three distinct options with exactly one correct", () => {
    for (const round of buildListenRounds(sources, "s")) {
      expect(round.options).toHaveLength(3);
      expect(round.options.filter((o) => o.correct)).toHaveLength(1);
      expect(new Set(round.options.map((o) => o.word)).size).toBe(3);
      expect(round.options.find((o) => o.correct)?.word).toBe(round.answer);
    }
  });

  it("tolerates a phrase with no clip rather than dropping the round", () => {
    const silent = sources.map((s) => ({ ...s, audioPath: null }));
    const rounds = buildListenRounds(silent, "s");
    expect(rounds).toHaveLength(3);
    expect(rounds.every((r) => r.audioPath === null)).toBe(true);
  });

  it("is deterministic per seed", () => {
    expect(buildListenRounds(sources, "d")).toEqual(
      buildListenRounds(sources, "d"),
    );
  });
});
