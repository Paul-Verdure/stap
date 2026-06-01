import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ===========================================================================
   Stap buttons (G1.4). Presentational + prop-forwarding, server-renderable.
   Interactivity (onClick) is attached by client consumers; navigation uses
   `asChild` to compose with next-intl <Link> (Radix Slot) without coupling
   the primitive to the router.

   Palette discipline: only ink / beige / amber — no semantic red/green, even
   for the destructive ("Delete") action (it reuses amber + ink in G8).
=========================================================================== */

type CtaVariant = "primary" | "ink" | "commitment";
type CtaSize = "md" | "lg";

// primary    = amber fill + INVARIANT ink label (text-on-accent; never
//              text-foreground, which inverts to beige and fails on amber)
// ink        = ink fill + beige label (inverts WITH the theme — stays readable)
// commitment = ink fill + beige label, the sticky bottom commitment button
//              (full-width by default; same colors as `ink`, distinct intent)
const VARIANT: Record<CtaVariant, string> = {
  primary: "border-structural bg-accent text-on-accent",
  ink: "border-structural bg-foreground text-background",
  commitment: "border-structural bg-foreground text-background",
};

const SIZE: Record<CtaSize, string> = {
  md: "min-h-11 px-5 text-body", // 44px touch target
  lg: "min-h-[52px] px-6 text-body",
};

type CtaProps = {
  variant?: CtaVariant;
  size?: CtaSize;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Render the child element instead of a <button> (e.g. a next-intl Link). */
  asChild?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled">;

export function Cta({
  variant = "primary",
  size = "md",
  fullWidth,
  disabled = false,
  asChild = false,
  className,
  children,
  ...props
}: CtaProps) {
  const isFull = fullWidth ?? variant === "commitment";
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-display font-semibold select-none",
    SIZE[size],
    disabled
      ? // Disabled = dashed outline, no fill (per design).
        "border-dashed-ink bg-transparent text-muted cursor-not-allowed"
      : VARIANT[variant],
    isFull && "w-full",
    className,
  );

  // A disabled control is always a real <button> (links can't be disabled).
  if (asChild && !disabled) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------------
   SecondaryLink — low-emphasis text action with a dashed underline.
   "I already have an account", "Edit my answers", "No chance today".
--------------------------------------------------------------------------- */
export function SecondaryLink({
  asChild = false,
  className,
  children,
  ...props
}: {
  asChild?: boolean;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(
    "text-body text-foreground underline decoration-dashed decoration-1 underline-offset-4 hover:text-muted",
    className,
  );
  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------------
   IconButton — circular icon-only button (close ×, filters, settings).
   `label` is required and becomes the accessible name; the icon is decorative.
--------------------------------------------------------------------------- */
export function IconButton({
  label,
  size = "md",
  variant = "outline",
  className,
  children,
  ...props
}: {
  label: string;
  size?: "sm" | "md";
  variant?: "outline" | "ghost";
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full text-foreground",
        size === "sm" ? "h-9 w-9" : "h-11 w-11", // 36 / 44px
        variant === "outline" ? "border-structural bg-surface" : "bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
