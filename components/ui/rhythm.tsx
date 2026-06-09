import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

/* ===========================================================================
   Stap rhythm vocabulary (G1.3) — the single most reused primitive.
   Appears in Home, Validation (Feel cards), Journal, Profile.
   ---------------------------------------------------------------------------
   Progress is the *weekly rhythm*, never a streak. Five cell states encode a
   day; a "today" modifier adds a ring. The shapes are deliberately distinct
   so the meaning survives without color (a11y contract):

     empty     outlined square            no step that day
     at-ease   solid fill                 attempted, felt at ease
     hesitant  half-diagonal fill         attempted, felt hesitant
     missed    amber fill                 "Missed it" (still a step)
     skip      outlined square + dot      "No chance today" (not a step)

   `missed` is the one color-led state; its amber has a large luminance gap
   from ink, AND every unit carries a programmatic label when meaningful, so
   the information is never color-only (WCAG 1.4.1).

   Theme-aware purely through tokens: `--color-foreground` inverts in dark
   mode (ink→beige), `--color-accent` (amber) is constant.
=========================================================================== */

export type RhythmState = "empty" | "at-ease" | "hesitant" | "missed" | "skip";

export type RhythmDay = {
  state: RhythmState;
  today?: boolean;
  /** Accessible per-day label, e.g. "Tuesday: missed it". Optional. */
  label?: string;
};

export type RhythmSize = "sm" | "md" | "lg";

const SIZES: Record<RhythmSize, { box: string; dot: string; offset: string }> = {
  sm: { box: "h-3 w-3 rounded-[3px]", dot: "h-1 w-1", offset: "2px" },
  md: { box: "h-4 w-4 rounded-[3px]", dot: "h-1.5 w-1.5", offset: "3px" },
  lg: { box: "h-6 w-6 rounded-[4px]", dot: "h-2 w-2", offset: "3px" },
};

// States that count as a "step" (an attempt). `skip` and `empty` do not.
const STEP_STATES: ReadonlySet<RhythmState> = new Set([
  "at-ease",
  "hesitant",
  "missed",
]);

/** Number of attempts ("steps") in a set of days — excludes empty and skip. */
export function countSteps(days: readonly RhythmDay[]): number {
  return days.reduce((n, d) => (STEP_STATES.has(d.state) ? n + 1 : n), 0);
}

/* ---------------------------------------------------------------------------
   RhythmUnit — one day cell.
   Pass `label` to expose it as role="img"; otherwise it is decorative
   (aria-hidden) and the surrounding context carries the meaning.
--------------------------------------------------------------------------- */
export function RhythmUnit({
  state,
  today = false,
  size = "md",
  label,
  onHero = false,
  className,
}: {
  state: RhythmState;
  today?: boolean;
  size?: RhythmSize;
  label?: string;
  /** Render on the ink hero surface (StreakBox / Feel cards): the ink fills
      swap to the beige hero foreground so they stay visible; amber is kept. */
  onHero?: boolean;
  className?: string;
}) {
  const sz = SIZES[size];

  // The "ink" of the cell tracks the surface: page foreground by default,
  // hero foreground (beige) on the ink hero. Amber (missed) is invariant.
  const ink = onHero ? "var(--color-hero-fg)" : "var(--color-foreground)";
  const border = onHero ? "var(--color-hero-border)" : "var(--color-foreground)";

  // Deterministic inline style. The today ring uses `outline` (not box-shadow)
  // to respect the brutalist "the only shadow is the focus ring" rule while
  // staying combinable with every state and not affecting layout size.
  const style: CSSProperties = {
    border:
      state === "missed"
        ? "1.5px solid var(--color-accent)"
        : `1.5px solid ${border}`,
  };
  if (state === "at-ease") style.background = ink;
  else if (state === "missed") style.background = "var(--color-accent)";
  else if (state === "hesitant")
    style.background = `linear-gradient(to bottom right, ${ink} 0 50%, transparent 50%)`;
  if (today) {
    style.outline = `1.5px solid ${ink}`;
    style.outlineOffset = sz.offset;
  }

  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <span
      {...a11y}
      style={style}
      className={cn(
        "inline-grid shrink-0 place-items-center",
        sz.box,
        className,
      )}
    >
      {state === "skip" ? (
        <span
          aria-hidden
          style={{ background: ink }}
          className={cn("rounded-full", sz.dot)}
        />
      ) : null}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   MiniRhythm — a row of day cells (canonically 7) + optional caption.
   The row is decorative by default; the visible `caption` ("This week —
   N steps") carries the accessible summary. Pass `ariaLabel` to instead
   expose the row itself as role="img" with day-level detail.
   Provide a caption OR an ariaLabel so it is never silent to screen readers.
--------------------------------------------------------------------------- */
export function MiniRhythm({
  days,
  caption,
  ariaLabel,
  size = "md",
  onHero = false,
  className,
}: {
  days: readonly RhythmDay[];
  caption?: React.ReactNode;
  ariaLabel?: string;
  size?: RhythmSize;
  onHero?: boolean;
  className?: string;
}) {
  const a11y = ariaLabel
    ? ({ role: "img", "aria-label": ariaLabel } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div {...a11y} className="flex items-center gap-1.5">
        {days.map((d, i) => (
          <RhythmUnit
            key={i}
            state={d.state}
            today={d.today}
            size={size}
            onHero={onHero}
          />
        ))}
      </div>
      {caption ? <p className="text-helper text-muted">{caption}</p> : null}
    </div>
  );
}
