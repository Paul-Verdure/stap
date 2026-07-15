"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/* ===========================================================================
   BottomNav (G2.3) — the 4-tab navigation for the main (app) routes.
   ---------------------------------------------------------------------------
   Hidden in "focus mode": preparation, validation, and (later) active games
   have a single exit and no bottom nav. `usePathname` from next-intl returns
   the path WITHOUT the locale prefix, so matching is locale-agnostic.

   Active = ink label + an amber dot underline; inactive = warm gray. Color is
   never the sole signal: the active tab also carries `aria-current="page"`
   and a heavier ink label (a11y contract).

   The highlight moves OPTIMISTICALLY: tapping a tab restyles it immediately
   (pendingHref), before the server round-trip completes — otherwise the nav
   sits frozen for the whole fetch and taps feel dead. `aria-current` stays
   tied to the real pathname (the committed route), never the optimistic one.
=========================================================================== */

const TABS = [
  { href: "/today", key: "today" },
  { href: "/journal", key: "journal" },
  { href: "/games", key: "games" },
  { href: "/profile", key: "profile" },
] as const;

// Routes that render in focus mode (no bottom nav): preparation, validation,
// and the active games (the hub and the review stub keep the nav). Matched
// exactly, so /games and /games/review are unaffected.
const FOCUS_ROUTES = [
  "/today/prepare",
  "/today/validate",
  "/games/match",
  "/games/fill",
  "/games/listen",
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Clear the optimistic highlight once the navigation commits (any pathname
  // change) — also covers an abandoned navigation resolving elsewhere.
  // State-reset-during-render pattern (not an effect, per react-hooks rules).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setPendingHref(null);
  }

  if (FOCUS_ROUTES.includes(pathname)) {
    return null;
  }

  return (
    <nav
      aria-label={t("label")}
      className="sticky bottom-0 z-40 grid grid-cols-4 border-t-[1.5px] border-foreground bg-surface"
    >
      {TABS.map(({ href, key }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        // While a tap is pending, the highlight belongs to the tapped tab.
        const active = pendingHref ? pendingHref === href : current;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            onClick={(e) => {
              // Plain left-click only: modified clicks open a new tab and
              // must not move the highlight here.
              if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                setPendingHref(href);
              }
            }}
            className={cn(
              "flex touch-manipulation flex-col items-center justify-center gap-1.5 py-3 text-helper font-display font-semibold active:opacity-70",
              active ? "text-foreground" : "text-muted",
            )}
          >
            <span>{t(key)}</span>
            {/* Amber dot underline marks the active tab (decorative; the ink
                label + aria-current carry the meaning). */}
            <span
              aria-hidden
              className={cn(
                "h-1 w-1 rounded-full",
                active ? "bg-accent" : "bg-transparent",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
