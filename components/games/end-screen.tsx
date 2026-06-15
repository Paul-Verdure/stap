import type { ReactNode } from "react";

import { CheckIcon } from "@/components/ui/icons";

/* ===========================================================================
   EndScreen (G7.2 skeleton, fleshed out in G7.3) — the shared game recap.
   ---------------------------------------------------------------------------
   An ink "Done" chip with an amber tick (a recap, never a score), a Syne
   title + subtitle, an optional recap block, and the action stack. No
   score, no penalty anywhere. Heading level is h2: the route's h1 is the
   game title in the GameShell topbar.
=========================================================================== */
export function EndScreen({
  doneLabel,
  title,
  subtitle,
  recap,
  actions,
}: {
  doneLabel: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Optional recap block (the matched pairs / completed sentences). */
  recap?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col gap-6 px-5 py-8"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 font-display text-eyebrow font-bold uppercase text-background">
          <CheckIcon className="h-3.5 w-3.5 text-accent" aria-hidden />
          {doneLabel}
        </span>
        <h2 className="font-display text-question text-balance">{title}</h2>
        {subtitle ? <p className="text-body text-muted">{subtitle}</p> : null}
      </div>

      {recap}

      <div className="mt-auto flex flex-col gap-3">{actions}</div>
    </main>
  );
}
