import type { ReactNode } from "react";

import { SkipLink } from "@/components/layout/skip-link";
import { Link } from "@/i18n/navigation";
import { BackIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/* ===========================================================================
   TopBar (G2.4) — sub-route / tab header: an optional back control, a centered
   title, and an optional right slot (filters, settings — wired in G6/G8).

   Back is a deterministic <Link> (next-intl, locale-aware) rather than
   history.back(), so it always lands on a known parent. The title is the
   route's <h1> by default; pass `titleAs="p"` when the page carries its own
   heading elsewhere. Server-renderable.
=========================================================================== */
export function TopBar({
  title,
  backHref,
  backLabel,
  right,
  titleAs: TitleTag = "h1",
  className,
}: {
  title: ReactNode;
  /** When set, renders a back control linking to this (locale-relative) path. */
  backHref?: string;
  /** Accessible name for the back control (required when backHref is set). */
  backLabel?: string;
  right?: ReactNode;
  titleAs?: "h1" | "p";
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-3 pt-3 pb-3",
        className,
      )}
    >
      <SkipLink />
      <div className="flex justify-start">
        {backHref ? (
          <Link
            href={backHref}
            aria-label={backLabel}
            className="border-structural inline-grid h-11 w-11 place-items-center rounded-full bg-surface text-foreground"
          >
            <BackIcon className="h-5 w-5" />
          </Link>
        ) : null}
      </div>
      <TitleTag className="text-center font-display text-greeting font-bold">
        {title}
      </TitleTag>
      <div className="flex justify-end">{right}</div>
    </header>
  );
}
