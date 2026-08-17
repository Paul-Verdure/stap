import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/* ===========================================================================
   The design system's contrast contract, asserted against the tokens.

   This suite exists because of a specific failure. Three separate defects
   shipped — an invisible selected state in dark mode, invisible rhythm cells
   in light mode, and one more found while fixing those — and every one of them
   passed axe, because axe checks text against its own background and never
   compares a selected control against an unselected one. Nothing in the
   project asserted that a *state* was visible, so nothing caught them.

   These are token-level, not screenshot-level: they read app/globals.css and
   check the pairs the components actually compose, in BOTH themes. That makes
   them cheap enough for CI and specific enough to name the bug they prevent.

   Thresholds are WCAG 2.2: 4.5:1 for body text, 3:1 for non-text things that
   carry meaning (1.4.11) — which is what a selection indicator is.
=========================================================================== */

const CSS = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);

/** Custom properties declared in the rule block for `selector`. */
function tokensIn(selector: string): Record<string, string> {
  // Anchor at a line start so `[data-theme="dark"]` does not also match the
  // later `html[data-theme="dark"]` rule.
  const at = CSS.search(new RegExp(`^${selector.replace(/[[\]"^$.*+?()\\|{}]/g, "\\$&")}\\s*\\{`, "m"));
  if (at === -1) throw new Error(`no rule block for ${selector}`);
  const open = CSS.indexOf("{", at);
  let depth = 0;
  let end = open;
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === "{") depth++;
    else if (CSS[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = CSS.slice(open + 1, end);
  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(
    /(--[\w-]+)\s*:\s*([^;]+);/g,
  )) {
    out[name] = value.trim();
  }
  return out;
}

const light = tokensIn(":root");
const dark = { ...light, ...tokensIn('[data-theme="dark"]') };
const THEMES = { light, dark } as const;

function luminance(hex: string): number {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Resolve a token name to its hex value in a theme. */
function color(theme: keyof typeof THEMES, token: string): string {
  const value = THEMES[theme][token];
  if (!value) throw new Error(`token ${token} missing in ${theme}`);
  return value;
}

const ratio = (theme: keyof typeof THEMES, a: string, b: string) =>
  contrast(color(theme, a), color(theme, b));

describe("selection is visible in both themes", () => {
  // `surface-selected` paints --color-foreground (--stap-ink) and sits next to
  // unselected siblings on --color-surface (--stap-surface). This is the pair
  // that measured 1.10:1 in dark mode when selection reused the hero.
  it.each(["light", "dark"] as const)(
    "%s: a selected control is distinguishable from an unselected one",
    (theme) => {
      expect(ratio(theme, "--stap-ink", "--stap-surface")).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(["light", "dark"] as const)(
    "%s: label text on a selected control is readable",
    (theme) => {
      expect(ratio(theme, "--stap-bg", "--stap-ink")).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(["light", "dark"] as const)(
    "%s: muted text on a selected control is readable",
    (theme) => {
      // The sublabel on a selected language card. It cannot use --stap-muted,
      // which is tuned for the page, and it cannot use --stap-hero-muted in
      // both themes — hence its own token.
      expect(
        ratio(theme, "--stap-selected-muted", "--stap-ink"),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe("the hero surface stays legible in both themes", () => {
  // The hero is invariant ink + amber, so anything drawn on it must contrast
  // with ink in BOTH themes — including the rhythm cells, which measured 1:1
  // in light mode when they borrowed the card-outline token.
  it.each(["light", "dark"] as const)(
    "%s: rhythm cells and text on the hero are visible",
    (theme) => {
      expect(ratio(theme, "--stap-hero-fg", "--stap-hero-bg")).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(["light", "dark"] as const)("%s: hero body text is readable", (theme) => {
    expect(ratio(theme, "--stap-hero-fg", "--stap-hero-bg")).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["light", "dark"] as const)("%s: hero muted text is readable", (theme) => {
    expect(ratio(theme, "--stap-hero-muted", "--stap-hero-bg")).toBeGreaterThanOrEqual(4.5);
  });

  it("carves the hero out of the page only where the page is also ink", () => {
    // Encodes the token's actual job, so nobody "fixes" light mode by making
    // the outline visible: in light the hero sits on beige and needs no
    // border, in dark the page is ink too and the border is what separates it.
    expect(color("light", "--stap-hero-border")).toBe(color("light", "--stap-hero-bg"));
    expect(
      contrast(color("dark", "--stap-hero-border"), color("dark", "--stap-bg")),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("page text meets AA in both themes", () => {
  it.each(["light", "dark"] as const)("%s: body text on the page", (theme) => {
    expect(ratio(theme, "--stap-ink", "--stap-bg")).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["light", "dark"] as const)("%s: body text on a card", (theme) => {
    expect(ratio(theme, "--stap-ink", "--stap-surface")).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["light", "dark"] as const)("%s: muted text on page and card", (theme) => {
    expect(ratio(theme, "--stap-muted", "--stap-bg")).toBeGreaterThanOrEqual(4.5);
    expect(ratio(theme, "--stap-muted", "--stap-surface")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("amber is a fill, never text on a light ground", () => {
  it.each(["light", "dark"] as const)(
    "%s: ink on amber is readable, and amber is unchanged across themes",
    (theme) => {
      expect(ratio(theme, "--stap-on-accent", "--stap-amber")).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("keeps amber and its foreground identical in both themes", () => {
    // The signature does not invert. If amber ever became theme-dependent,
    // every "amber on ink" assumption in the components would need revisiting.
    expect(color("dark", "--stap-amber")).toBe(color("light", "--stap-amber"));
    expect(color("dark", "--stap-on-accent")).toBe(color("light", "--stap-on-accent"));
  });

  it("records why amber is not used as text on beige", () => {
    // Not a bug — a constraint the palette lives with, asserted so it stays
    // visible: amber on the light page is ~2:1, which is why amber is a shape
    // on light surfaces and only ever text on ink.
    expect(ratio("light", "--stap-amber", "--stap-bg")).toBeLessThan(3);
    expect(ratio("light", "--stap-amber", "--stap-hero-bg")).toBeGreaterThanOrEqual(4.5);
  });
});
