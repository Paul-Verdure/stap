import type { ReactNode } from "react";

import { SkipLink } from "@/components/layout/skip-link";
import { cn } from "@/lib/cn";

/* ===========================================================================
   AppBar (G2.4) — the Home header: wordmark on the left, a slot on the right
   for the week's MiniRhythm. Server-renderable; the rhythm data is passed in
   by the page (real data arrives in G4).

   It is the page's banner landmark, so exactly one AppBar/TopBar renders per
   route. The wordmark "Stap" is the brand (invariant, not translated).
=========================================================================== */
export function AppBar({
  right,
  className,
}: {
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 px-5 pt-5 pb-3",
        className,
      )}
    >
      <SkipLink />
      <span className="font-display text-greeting font-bold tracking-tight">
        Stap
      </span>
      {right ? <div className="flex items-center">{right}</div> : null}
    </header>
  );
}
