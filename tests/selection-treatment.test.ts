import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/* ===========================================================================
   Source guard: a selected control must never be painted with the hero.

   tests/theme-contrast.test.ts checks the palette, and that is not enough on
   its own — it passes happily while a component reaches for the wrong token.
   This is the test that would actually have caught the bug it is named after.

   The hero (`surface-hero`, or its parts `bg-hero-bg` / `border-hero-border` /
   `text-hero-fg`) is INVARIANT ink by design: the signature never inverts. So
   the moment it is used to mean "this one is picked", dark mode loses the
   distinction entirely — a selected card becomes #1A1A1A on a #242220 surface
   with the same beige border as its neighbours, 1.10:1, no visible selection.

   It shipped in five places, and the reason it took two passes to find them
   all is worth encoding: three used the `surface-hero` utility and were found
   by grepping its name, while Chip, TimeSlot and RadioRow spelled the same
   treatment out atomically and matched no search for it. Selection belongs to
   `surface-selected`, which inverts with the theme.
=========================================================================== */

const COMPONENTS = fileURLToPath(new URL("../components", import.meta.url));

/** Every .tsx under components/, recursively. */
function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return componentFiles(path);
    return entry.isFile() && path.endsWith(".tsx") ? [path] : [];
  });
}

/** Strip comments so prose about the bug is not mistaken for the bug. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

const HERO = /surface-hero|bg-hero-bg|border-hero-border|text-hero-fg/g;

/** A selection signal close enough to be styling this hero usage. */
const SELECTION =
  /\b(selected|isSelected|isChecked|checked|pressed)\b\s*(\?|&&)|data-\[state=checked\]:\s*$|data-\[state=checked\]:$/;

/** Hero utilities applied directly by a checked-state variant. */
const CHECKED_VARIANT =
  /data-\[state=checked\]:(surface-hero|bg-hero-bg|border-hero-border|text-hero-fg)/;

type Finding = { file: string; snippet: string };

function findHeroAsSelection(): Finding[] {
  const findings: Finding[] = [];
  for (const file of componentFiles(COMPONENTS)) {
    const source = stripComments(readFileSync(file, "utf8"));
    const rel = file.slice(file.indexOf("components/"));

    if (CHECKED_VARIANT.test(source)) {
      findings.push({
        file: rel,
        snippet: CHECKED_VARIANT.exec(source)![0],
      });
    }

    for (const match of source.matchAll(HERO)) {
      const before = source.slice(Math.max(0, match.index - 200), match.index);
      if (SELECTION.test(before)) {
        findings.push({
          file: rel,
          snippet: `${before.slice(-70).replace(/\s+/g, " ").trim()} >>${match[0]}<<`,
        });
      }
    }
  }
  return findings;
}

describe("the hero treatment is never a selection state", () => {
  it("finds no component painting a selected control with the hero", () => {
    const findings = findHeroAsSelection();
    expect(
      findings,
      findings.length
        ? `Use surface-selected instead — the hero does not invert, so these are ` +
            `invisible as a selected state in dark mode:\n` +
            findings.map((f) => `  ${f.file}: ${f.snippet}`).join("\n")
        : undefined,
    ).toEqual([]);
  });

  it("still scans a meaningful number of components", () => {
    // Guards the guard: a rename that empties the sweep would otherwise make
    // this suite pass by looking at nothing.
    const files = componentFiles(COMPONENTS);
    expect(files.length).toBeGreaterThan(30);
    expect(files.some((f) => f.endsWith("chip.tsx"))).toBe(true);
    expect(files.some((f) => f.endsWith("feel-card.tsx"))).toBe(true);
  });

  it("detects the pattern when it is present", () => {
    // Proves the matcher works, without depending on a real component being
    // broken. Both spellings that shipped are covered.
    const asUtility = `className={cn("card", selected ? "surface-hero" : "bg-surface")}`;
    const asAtoms = `className={cn(selected ? "border-hero-border bg-hero-bg text-hero-fg" : "x")}`;
    const asVariant = `className="data-[state=checked]:bg-hero-bg"`;
    for (const sample of [asUtility, asAtoms]) {
      const match = HERO.exec(sample);
      HERO.lastIndex = 0;
      expect(match).not.toBeNull();
      expect(SELECTION.test(sample.slice(0, match!.index))).toBe(true);
    }
    expect(CHECKED_VARIANT.test(asVariant)).toBe(true);
  });

  it("does not flag the hero used as an actual hero surface", () => {
    const heroCard = `className={cn("surface-hero", RADIUS[radius], PADDING[padding])}`;
    const listenDisc = `className={cn("surface-hero inline-grid place-items-center", s.circle)}`;
    for (const sample of [heroCard, listenDisc]) {
      const match = HERO.exec(sample);
      HERO.lastIndex = 0;
      expect(SELECTION.test(sample.slice(0, match!.index))).toBe(false);
    }
    expect(CHECKED_VARIANT.test(heroCard)).toBe(false);
  });
});
