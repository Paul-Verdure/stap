import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ===========================================================================
   Stap surfaces (G1.5)
   ---------------------------------------------------------------------------
   - Card: the everyday content surface (beige-light + 1.5px ink border).
   - HeroSurface: the SIGNATURE treatment (ink + amber, invariant across
     themes via `surface-hero`). Parameterized so the challenge card, identity
     card and recap banner all derive from one component.
   - Tag / StatusPill: small labels; amber ones use invariant ink text
     (`text-on-accent`) per the amber-contrast rule.
=========================================================================== */

const PADDING = {
  none: "",
  sm: "p-4", // 16px
  md: "p-5", // 20px
  lg: "p-6", // 24px
} as const;

const RADIUS = {
  md: "rounded-md", // 12px — secondary cards
  lg: "rounded-lg", // 16px — primary cards, hero
} as const;

type SurfaceProps = {
  as?: ElementType;
  padding?: keyof typeof PADDING;
  radius?: keyof typeof RADIUS;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

/* ---------------------------------------------------------------------------
   Card — beige-light surface, 1.5px ink border.
--------------------------------------------------------------------------- */
export function Card({
  as,
  padding = "md",
  radius = "lg",
  className,
  children,
  ...rest
}: SurfaceProps) {
  const Comp = (as ?? "div") as ElementType;
  return (
    <Comp
      className={cn(
        "border-structural bg-surface",
        RADIUS[radius],
        PADDING[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/* ---------------------------------------------------------------------------
   HeroSurface — the signature ink + amber treatment (invariant; beige border
   in dark to carve it off the dark page). Children get beige text by default;
   use text-accent for amber highlights and text-hero-muted for subtitles.
--------------------------------------------------------------------------- */
export function HeroSurface({
  as,
  padding = "md",
  radius = "lg",
  className,
  children,
  ...rest
}: SurfaceProps) {
  const Comp = (as ?? "div") as ElementType;
  return (
    <Comp
      className={cn("surface-hero", RADIUS[radius], PADDING[padding], className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/* ---------------------------------------------------------------------------
   Tag — small metadata label.
     default = ink text + hairline border (on beige surfaces)
     hero    = beige text + muted-beige border (inside the hero)
     amber   = amber fill + INVARIANT ink text (emphasis)
--------------------------------------------------------------------------- */
type TagTone = "default" | "hero" | "amber";

const TAG_TONE: Record<TagTone, string> = {
  default: "border border-hairline text-foreground",
  hero: "border border-hero-muted text-hero-fg",
  amber: "bg-accent text-on-accent",
};

export function Tag({
  tone = "default",
  className,
  children,
}: {
  tone?: TagTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-helper font-medium leading-tight",
        TAG_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   StatusPill — amber status indicator used inside the hero ("Prep viewed",
   "Done"). Amber fill + invariant ink text; uppercase Syne.
--------------------------------------------------------------------------- */
export function StatusPill({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-accent px-2.5 py-1 font-display text-eyebrow uppercase text-on-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}
