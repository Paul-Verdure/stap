/* ===========================================================================
   FillPhrase (G7.4) — the sentence frame with a gap. While playing, the gap
   is an empty slot; in the recap it carries the placed word in an amber chip
   (invariant ink on amber, per the amber rule). The whole frame is Dutch
   (lang="nl"); the clue above it is the localized meaning.
=========================================================================== */
export function FillPhrase({
  clue,
  prefix,
  suffix,
  placed,
  blankLabel,
}: {
  clue: string;
  prefix: string;
  suffix: string;
  /** The placed word (recap); when absent the gap is shown empty. */
  placed?: string;
  /** Accessible name for the empty gap (e.g. "missing word"). */
  blankLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-helper text-muted">{clue}</p>
      <p className="font-display text-question text-balance" lang="nl">
        {prefix}
        {placed ? (
          <span className="mx-0.5 inline-flex items-center rounded-sm bg-accent px-2 py-0.5 text-on-accent">
            {placed}
          </span>
        ) : (
          <span className="mx-0.5 inline-flex min-w-16 items-center justify-center rounded-sm border-dashed-ink px-2 py-0.5 align-middle">
            <span className="sr-only">{blankLabel}</span>
            <span aria-hidden className="text-muted">
              ·····
            </span>
          </span>
        )}
        {suffix}
      </p>
    </div>
  );
}
