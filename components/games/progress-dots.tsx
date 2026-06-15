import { cn } from "@/lib/cn";

/* ===========================================================================
   ProgressDots (G7.4) — round progress for Fill and Listen.
   ---------------------------------------------------------------------------
   Decorative (aria-hidden): the spoken progress is carried by the game's
   aria-live counter. State reads by SHAPE, not colour alone — empty is a
   hollow outline, done is a solid fill, current adds a ring around the fill.
=========================================================================== */
export function ProgressDots({
  total,
  doneCount,
}: {
  total: number;
  /** Number of completed rounds; that index is the current round. */
  doneCount: number;
}) {
  return (
    <ul aria-hidden className="flex list-none items-center gap-2 p-0">
      {Array.from({ length: total }).map((_, i) => {
        const state = i < doneCount ? "done" : i === doneCount ? "current" : "empty";
        return (
          <li
            key={i}
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              state === "done" && "bg-foreground",
              state === "current" &&
                "bg-accent ring-2 ring-foreground ring-offset-2 ring-offset-background",
              state === "empty" && "border-[1.5px] border-hairline",
            )}
          />
        );
      })}
    </ul>
  );
}
