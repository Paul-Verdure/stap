import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/* ===========================================================================
   LangCard (G3) — a selectable language card. Used on onboarding Screen 0 and
   reused in the Profile language modal (G8).
   ---------------------------------------------------------------------------
   The label + sublabel are each written in their OWN language and are
   INVARIANT (never translated), so the caller passes them verbatim and sets
   `lang` so assistive tech announces them correctly. Selected = the signature
   hero treatment (ink + amber + beige), unselected = beige surface.
=========================================================================== */
export function LangCard({
  label,
  sublabel,
  selected = false,
  lang,
  className,
  ...props
}: {
  /** Endonym, e.g. "Français" (invariant). */
  label: string;
  /** Own-language descriptor, e.g. "Je parle français" (invariant). */
  sublabel: string;
  selected?: boolean;
  /** BCP-47 tag for the card's own language ("en" | "fr"). */
  lang: string;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "lang">) {
  return (
    <button
      type="button"
      lang={lang}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-lg border-structural p-5 text-left",
        selected ? "surface-hero" : "bg-surface text-foreground",
        className,
      )}
      {...props}
    >
      <span className="block font-display text-greeting font-bold">{label}</span>
      <span
        className={cn(
          "mt-1 block text-helper",
          selected ? "text-hero-muted" : "text-muted",
        )}
      >
        {sublabel}
      </span>
    </button>
  );
}
