import { describe, expect, it } from "vitest";

import { localize } from "@/lib/localize";

/* ADR 0001 — localized catalog fields are one column per locale, read through
   this single accessor. The point of the ADR is that `locale === "fr" ? …`
   never spreads through the codebase, so what matters here is the fallback
   contract: anything that is not a known non-default locale must resolve to
   English rather than to undefined. A page rendering `undefined` is the
   failure this prevents. */

const row = {
  meaningEn: "That's five euros.",
  meaningFr: "Ça fait cinq euros.",
  tipsEn: ["Euro stays singular after a number.", "The ij is the 'ay' sound."],
  tipsFr: ["Euro reste au singulier après un nombre.", "Le ij se dit « ay »."],
};

describe("localize — ADR 0001 accessor", () => {
  it("reads the French column for fr", () => {
    expect(localize(row, "meaning", "fr")).toBe("Ça fait cinq euros.");
  });

  it("reads the English column for en", () => {
    expect(localize(row, "meaning", "en")).toBe("That's five euros.");
  });

  it("falls back to English for anything unknown", () => {
    // Route params hand us a plain string, so this is reachable in production
    // rather than hypothetical: a bad or truncated locale must render English,
    // never undefined.
    for (const locale of ["", "de", "EN", "fr-BE", "nl", "En", "  fr"]) {
      expect(localize(row, "meaning", locale)).toBe("That's five euros.");
    }
  });

  it("is exact about the French locale code", () => {
    // "FR" and "fr-BE" are not the routing locale; silently treating them as
    // French would mean the UI language and the catalog language disagree.
    expect(localize(row, "meaning", "FR")).toBe("That's five euros.");
    expect(localize(row, "meaning", "fr")).not.toBe("That's five euros.");
  });

  it("carries the column's own type through, including arrays", () => {
    const tips = localize(row, "tips", "fr");
    expect(Array.isArray(tips)).toBe(true);
    expect(tips).toHaveLength(2);
    expect(tips[0]).toContain("singulier");
  });

  it("never mutates the row it reads", () => {
    const snapshot = structuredClone(row);
    localize(row, "meaning", "fr");
    localize(row, "tips", "en");
    expect(row).toEqual(snapshot);
  });
});
