import type { ReactNode } from "react";

import { HeroSurface, Tag } from "@/components/ui/surface";
import { Eyebrow, Nl } from "@/components/ui/typography";
import { cn } from "@/lib/cn";

/* ===========================================================================
   ChallengeCard (G4) — the signature hero card for the daily challenge.
   Reused as the compact recap on the Preparation screen (G5). The Dutch
   phrase is invariant (lang="nl"); the translation is localized and muted.
   `status` is an optional in-hero pill slot (e.g. "Prep viewed" in State 2).
=========================================================================== */
export function ChallengeCard({
  eyebrow,
  level,
  context,
  nl,
  translation,
  status,
  className,
}: {
  eyebrow: ReactNode;
  /** CEFR code (invariant), shown as an amber tag. */
  level: string;
  /** Localized "where to use it" context name. */
  context?: string;
  /** The Dutch phrase (invariant). */
  nl: string;
  /** Localized meaning. */
  translation: string;
  /** Optional in-hero status pill (State 2 / State 3). */
  status?: ReactNode;
  className?: string;
}) {
  return (
    <HeroSurface padding="lg" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <Eyebrow tone="accent">{eyebrow}</Eyebrow>
        <div className="flex shrink-0 items-center gap-2">
          {status}
          <Tag tone="amber">{level}</Tag>
        </div>
      </div>

      {context ? (
        <p className="text-helper text-hero-muted">
          <span aria-hidden>→ </span>
          {context}
        </p>
      ) : null}

      <p className="font-display text-question text-balance text-hero-fg">
        <Nl>{nl}</Nl>
      </p>
      <p className="text-body text-hero-muted">{translation}</p>
    </HeroSurface>
  );
}
