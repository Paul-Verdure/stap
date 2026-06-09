import { cn } from "@/lib/cn";

/* ===========================================================================
   FeelCard (G5) — one of the three validation feelings, reusing the rhythm
   shapes (solid = at ease, half-diagonal = hesitant, amber = missed). Selected
   flips to the hero treatment; the shape recolours to the hero foreground so
   it stays visible on the ink surface (missed stays amber in every context).
   The product says "Missed it", never "failed".
=========================================================================== */

export type FeelKind = "AT_EASE" | "HESITANT" | "MISSED";

function FeelShape({ kind, selected }: { kind: FeelKind; selected: boolean }) {
  const box = "h-7 w-7 rounded-[5px]";

  if (kind === "MISSED") {
    return (
      <span
        aria-hidden
        className={box}
        style={{ background: "var(--color-accent)", border: "1.5px solid var(--color-accent)" }}
      />
    );
  }

  // On a selected card the surface is the ink hero, so the fill/border use the
  // hero tokens (beige); otherwise the page foreground (ink).
  const fill = selected ? "var(--color-hero-fg)" : "var(--color-foreground)";
  const border = selected ? "var(--color-hero-border)" : "var(--color-foreground)";

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
        selected ? "surface-hero" : "bg-surface text-foreground",
      )}
    >
      <FeelShape kind={kind} selected={selected} />
      <span className="font-display text-helper font-semibold">{label}</span>
    </button>
  );
}
