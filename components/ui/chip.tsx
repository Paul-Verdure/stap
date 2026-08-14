import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { CheckIcon, PlusIcon } from "./icons";

/* ===========================================================================
   Chip & TimeSlot (G1.6) — selectable pills. Presentational: the caller owns
   selection state and passes `selected` + onClick.

   Selection = `surface-selected`, the inverted page (container-selection
   rule). A selected Chip carries an amber check (multi-select membership); a
   selected RadioRow carries an amber dot (single-select) — that is how multi
   vs single read distinctly. The "add" Chip is dashed (a different action:
   open an input).

   These two used to spell the hero treatment out atomically
   (`border-hero-border bg-hero-bg text-hero-fg`) rather than through the
   `surface-hero` utility, which is how they survived the first sweep of this
   bug: the hero never inverts, so in dark mode a selected control was #1A1A1A
   on a #242220 surface — 1.10:1, no visible selection. TimeSlot was the worst
   of the set, being the only one of these with no second cue: Chip at least
   carried its amber check.
=========================================================================== */

type ChipProps = {
  selected?: boolean;
  variant?: "default" | "add";
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed">;

export function Chip({
  selected = false,
  variant = "default",
  className,
  children,
  ...props
}: ChipProps) {
  if (variant === "add") {
    return (
      <button
        type="button"
        className={cn(
          "inline-flex touch-manipulation items-center gap-1.5 rounded-md border-dashed-ink bg-transparent px-3 py-2 text-body text-muted",
          "hover:text-foreground active:opacity-70",
          className,
        )}
        {...props}
      >
        <PlusIcon className="h-4 w-4" />
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex touch-manipulation items-center gap-1.5 rounded-md px-3 py-2 text-body active:opacity-70",
        selected
          ? "surface-selected"
          : "border-structural bg-surface text-foreground",
        className,
      )}
      {...props}
    >
      {selected ? <CheckIcon className="h-4 w-4 text-accent" /> : null}
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------------
   TimeSlot — a cell in the reminder grid (morning / midday / evening / Off).
   Single-select visual: selected = inverted, off = outlined, disabled = dimmed
   (used when "At my own pace" turns the reminder block off).
--------------------------------------------------------------------------- */
export function TimeSlot({
  selected = false,
  disabled = false,
  className,
  children,
  ...props
}: {
  selected?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "inline-flex touch-manipulation items-center justify-center rounded-md px-4 py-3 text-body font-medium active:opacity-70",
        selected
          ? "surface-selected"
          : "border-structural bg-surface text-foreground",
        disabled && "cursor-not-allowed opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
