import type { ReactNode } from "react";

import { SkipLink } from "@/components/layout/skip-link";
import { CloseIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";

/* ===========================================================================
   GameShell + GameTopbar (G7.2) — the shared in-game frame.
   ---------------------------------------------------------------------------
   Focus mode: the bottom nav is hidden (the route is in FOCUS_ROUTES) and the
   close × is the ONLY exit — confirm-less, a plain Link back to the hub
   (games carry no progress worth guarding). The amber counter pill shows the
   game's place in the A → B → C sequence ("1/3"); it is static, so no
   aria-live (the contract's live counters are the in-game ones).

   Server-renderable: the shell stays RSC; each game's interactive body is a
   client child that renders the single <main id="main-content">.
=========================================================================== */
export function GameShell({
  position,
  total,
  title,
  counterLabel,
  closeLabel,
  children,
}: {
  /** 1-based position in the game sequence. */
  position: number;
  total: number;
  title: ReactNode;
  /** Accessible expansion of the pill, e.g. "Game 1 of 3". */
  counterLabel: string;
  closeLabel: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-2 px-3 pt-3 pb-3">
        <SkipLink />
        <span className="justify-self-start">
          <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 font-display text-eyebrow font-bold text-on-accent">
            <span aria-hidden>
              {position}/{total}
            </span>
            <span className="sr-only">{counterLabel}</span>
          </span>
        </span>
        <h1 className="text-center font-display text-greeting font-bold">
          {title}
        </h1>
        <Link
          href="/games"
          aria-label={closeLabel}
          className="border-structural inline-grid h-11 w-11 place-items-center justify-self-end rounded-full bg-surface text-foreground"
        >
          <CloseIcon className="h-5 w-5" />
        </Link>
      </header>
      {children}
    </>
  );
}
