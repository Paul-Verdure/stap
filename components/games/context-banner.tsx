import { HeroSurface } from "@/components/ui/surface";
import { Eyebrow, Nl } from "@/components/ui/typography";

/* ===========================================================================
   ContextBanner (G7.1) — the hub's inverted recap of the day's challenge.
   Hero treatment (ink + amber + beige, invariant across themes): the games
   are a warm replay of what the user actually did today, so the banner
   restates the phrase and where it was used. Purely presentational.
=========================================================================== */
export function ContextBanner({
  eyebrow,
  nl,
  translation,
  context,
}: {
  eyebrow: string;
  /** The Dutch phrase of the day (invariant). */
  nl: string;
  /** Localized meaning. */
  translation: string;
  /** Localized "where you used it" context name. */
  context?: string;
}) {
  return (
    <HeroSurface padding="md" className="flex flex-col gap-2">
      <Eyebrow tone="accent">{eyebrow}</Eyebrow>
      <p className="font-display text-greeting font-bold text-hero-fg">
        <Nl>{nl}</Nl>
      </p>
      <p className="text-helper text-hero-muted">
        {context ? (
          <>
            <span aria-hidden>→ </span>
            {context} · {translation}
          </>
        ) : (
          translation
        )}
      </p>
    </HeroSurface>
  );
}
