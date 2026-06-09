import { MiniRhythm, type RhythmDay } from "@/components/ui/rhythm";
import { HeroSurface } from "@/components/ui/surface";

/* ===========================================================================
   StreakBox (G5) — the confirmation's ink summary. NOT a streak in the
   loss-aversion sense: it shows the weekly step total, an amber "+1" for the
   step just taken, and the 7-day mini-rhythm (rendered onHero so the cells
   stay visible on ink; today's cell carries the feeling just recorded).
=========================================================================== */
export function StreakBox({
  rhythm,
  steps,
  label,
  rhythmAria,
  delta,
}: {
  rhythm: RhythmDay[];
  steps: number;
  label: string;
  rhythmAria: string;
  delta: string;
}) {
  return (
    <HeroSurface padding="lg" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-display text-display leading-none text-hero-fg">
            {steps}
          </span>
          <span className="mt-1 text-helper text-hero-muted">{label}</span>
        </div>
        <span className="font-display text-greeting text-accent">{delta}</span>
      </div>
      <MiniRhythm days={rhythm} onHero ariaLabel={rhythmAria} />
    </HeroSurface>
  );
}
