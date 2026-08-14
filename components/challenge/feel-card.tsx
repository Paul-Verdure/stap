import { cn } from "@/lib/cn";

/* ===========================================================================
   FeelCard (G5) — one of the three validation feelings, reusing the rhythm
   shapes (solid = at ease, half-diagonal = hesitant, amber = missed). Selected
   flips to `surface-selected`, the inverted page; the shape recolours to that
   card's own foreground so it stays visible (missed stays amber in every
   context). The product says "Missed it", never "failed".
=========================================================================== */

export type FeelKind = "AT_EASE" | "HESITANT" | "MISSED";

function FeelShape({ kind, selected }: { kind: FeelKind; selected: boolean }) {
  const box = "h-7 w-7 rounded-[5px]";

  // A selected card is the page inverted, so its own foreground is
  // `--color-background`. Everything drawn on it follows that, not the page.
  const fill = selected ? "var(--color-background)" : "var(--color-foreground)";

  if (kind === "MISSED") {
    return (
      <span
        aria-hidden
        className={box}
        style={{
          background: "var(--color-accent)",
          // Amber keeps its fill everywhere, but it cannot also supply its own
          // edge on a selected card: in dark mode that card is beige, and amber
          // on beige is 1.95:1. Outlining it in the card's foreground keeps the
          // square legible on either selected ground.
          border: `1.5px solid ${selected ? fill : "var(--color-accent)"}`,
        }}
      />
    );
  }

  const border = fill;

  return (
    <span
      aria-hidden
      className={box}
      style={
        kind === "HESITANT"
          ? {
              border: `1.5px solid ${border}`,
              background: `linear-gradient(to bottom right, ${fill} 0 50%, transparent 50%)`,
            }
          : { border: `1.5px solid ${border}`, background: fill }
      }
    />
  );
}

export function FeelCard({
  kind,
  label,
  selected,
  onClick,
}: {
  kind: FeelKind;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-lg border-structural px-3 py-4 text-center",
        selected ? "surface-selected" : "bg-surface text-foreground",
      )}
    >
      <FeelShape kind={kind} selected={selected} />
      <span className="font-display text-helper font-semibold">{label}</span>
    </button>
  );
}
