import { Card } from "@/components/ui/surface";
import { Nl } from "@/components/ui/typography";

/* ===========================================================================
   VocCard (G4) — a single vocabulary card in the Home horizontal scroll.
   Fixed min-width so the next card peeks (the "partial 4th card" affordance).
   Dutch word is invariant; meaning is localized. Audio (a word-scale
   ListenButton) is added in G5 when playback is wired and clips are synced.
=========================================================================== */
export function VocCard({ nl, meaning }: { nl: string; meaning: string }) {
  return (
    <Card
      padding="sm"
      radius="md"
      className="flex min-w-[8.5rem] shrink-0 flex-col gap-1"
    >
      <span className="font-display text-greeting">
        <Nl>{nl}</Nl>
      </span>
      <span className="text-helper text-muted">{meaning}</span>
    </Card>
  );
}

/* Horizontal, scroll-snapping row of VocCards. */
export function VocScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1">
      {children}
    </div>
  );
}
