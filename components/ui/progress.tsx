import { cn } from "@/lib/cn";

/* ===========================================================================
   ProgressBar (G3) — the onboarding stepper's progress indicator.
   ---------------------------------------------------------------------------
   A hairline track with an ink fill (ink, not amber: progress is structural,
   not an accent/consequence). The visible "n/total" fraction is decorative;
   the accessible name + value live on the progressbar role. No width
   transition (instant — the design forbids decorative motion).
=========================================================================== */
export function ProgressBar({
  value,
  total,
  label,
  className,
}: {
  /** Current step (1-based). */
  value: number;
  /** Total number of counted steps. */
  total: number;
  /** Accessible name, e.g. "Step 2 of 5". */
  label: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / total) * 100)));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline"
      >
        <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
      <span aria-hidden className="text-helper tabular-nums text-muted">
        {value}/{total}
      </span>
    </div>
  );
}
