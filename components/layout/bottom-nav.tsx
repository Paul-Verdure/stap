"use client";

import { useTranslations } from "next-intl";

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

  if (FOCUS_ROUTES.includes(pathname)) {
    return null;
  }

  return (
    <nav
      aria-label={t("label")}
      className="sticky bottom-0 z-40 grid grid-cols-4 border-t-[1.5px] border-foreground bg-surface"
    >
      {TABS.map(({ href, key }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 py-3 text-helper font-display font-semibold",
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
