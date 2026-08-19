import { describe, expect, it } from "vitest";

import {
  LEVELS,
  MIN_BAND_CONTEXT_POOL,
  MIN_REMAINING_CHOICES,
  REPEAT_WINDOW_DAYS,
  bandLevels,
  type Level,
} from "@/lib/challenge-config";

/* ADR 0002 — the daily challenge is drawn from a sliding two-level band, not
   from everything at or below the user's level. These assert the decision, not
   the implementation: if someone widens the band, these should fail and send
   them to the ADR. */

describe("bandLevels — ADR 0002 sliding band", () => {
  it("serves the user's own level plus the one below", () => {
    expect(bandLevels("A1")).toEqual(["A0", "A1"]);
    expect(bandLevels("A2")).toEqual(["A1", "A2"]);
    expect(bandLevels("B1")).toEqual(["A2", "B1"]);
    expect(bandLevels("B2")).toEqual(["B1", "B2"]);
  });

  it("gives the floor level a band of itself alone", () => {
    // A0 has nothing below it. This is why A0 is the binding constraint on
    // catalog volume: its band is one level wide, not two.
    expect(bandLevels("A0")).toEqual(["A0"]);
  });

  it("never serves a level above the user's own", () => {
    for (const level of LEVELS) {
      const ceiling = LEVELS.indexOf(level);
      for (const served of bandLevels(level)) {
        expect(LEVELS.indexOf(served)).toBeLessThanOrEqual(ceiling);
      }
    }
  });

  it("always includes the user's own level, and never more than two", () => {
    for (const level of LEVELS) {
      const band = bandLevels(level);
      expect(band).toContain(level);
      expect(band.length).toBeLessThanOrEqual(2);
      expect(band.length).toBeGreaterThan(0);
    }
  });

  it("is contiguous and ascending", () => {
    for (const level of LEVELS) {
      const indices = bandLevels(level).map((l) => LEVELS.indexOf(l));
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).toBe(indices[i - 1] + 1);
      }
    }
  });

  it("rejects nothing at the type level that the schema can produce", () => {
    // Every Level in the enum must be a legal input — a missing case would
    // return an empty band and strand that user with no phrases at all.
    for (const level of LEVELS satisfies readonly Level[]) {
      expect(bandLevels(level).length).toBeGreaterThan(0);
    }
  });
});

describe("pool floor is derived, not chosen", () => {
  it("leaves MIN_REMAINING_CHOICES after the repeat window is excluded", () => {
    // The floor exists so that excluding the window cannot empty the pool. If
    // someone raises REPEAT_WINDOW_DAYS without the floor following, selection
    // silently falls back to allowing a repeat.
    expect(MIN_BAND_CONTEXT_POOL).toBe(
      REPEAT_WINDOW_DAYS + MIN_REMAINING_CHOICES,
    );
    expect(MIN_BAND_CONTEXT_POOL - REPEAT_WINDOW_DAYS).toBeGreaterThanOrEqual(
      MIN_REMAINING_CHOICES,
    );
  });

  it("keeps a pick from being a foregone conclusion", () => {
    expect(MIN_REMAINING_CHOICES).toBeGreaterThan(1);
  });
});
