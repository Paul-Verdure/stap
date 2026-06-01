import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { CheckIcon, PlusIcon } from "./icons";

/* ===========================================================================
   Chip & TimeSlot (G1.6) — selectable pills. Presentational: the caller owns
   selection state and passes `selected` + onClick.

   Selection = the HERO treatment (container-selection rule). A selected Chip
   carries an amber check (multi-select membership); a selected RadioRow
   carries an amber dot (single-select) — that is how multi vs single read
   distinctly. The "add" Chip is dashed (a different action: open an input).
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
          "inline-flex items-center gap-1.5 rounded-md border-dashed-ink bg-transparent px-3 py-2 text-body text-muted",
          "hover:text-foreground",
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
        "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-body",
        selected
          ? "border-[1.5px] border-hero-border bg-hero-bg text-hero-fg"
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
   TimeSlot — a cell in the reminder-time grid (08:00 / 12:00 / 18:00 / Off).
   Single-select visual: selected = hero, off = outlined, disabled = dimmed
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
        "inline-flex items-center justify-center rounded-md px-4 py-3 text-body font-medium",
        selected
          ? "border-[1.5px] border-hero-border bg-hero-bg text-hero-fg"
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
