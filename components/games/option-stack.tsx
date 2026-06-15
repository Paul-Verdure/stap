"use client";

import { useTranslations } from "next-intl";

import { Nl } from "@/components/ui/typography";
import { cn } from "@/lib/cn";

/* ===========================================================================
   OptionStack (G7.4) — the three-choice answer stack for Fill and Listen.
   ---------------------------------------------------------------------------
   Options are always Dutch (the learning target), so each is wrapped lang=nl.
   A wrong pick is NEVER red and never blocks: it turns dashed and gains a
   "× try again" mark, but stays tappable (free retry, no penalty, no score).
   The right pick advances the round.
=========================================================================== */
export function OptionStack({
  options,
  wrongWords,
  onPick,
}: {
  options: { word: string; correct: boolean }[];
  /** Words already tried and wrong in the current round. */
  wrongWords: string[];
  onPick: (option: { word: string; correct: boolean }) => void;
}) {
  const t = useTranslations("Games");

  return (
    <ul className="flex list-none flex-col gap-3 p-0">
      {options.map((option) => {
        const wrong = wrongWords.includes(option.word);
        return (
          <li key={option.word}>
            <button
              type="button"
              onClick={() => onPick(option)}
              className={cn(
                "flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-body",
                wrong
                  ? "border-dashed-ink bg-transparent text-muted"
                  : "border-structural bg-surface text-foreground",
              )}
            >
              <Nl>{option.word}</Nl>
              {wrong ? (
                <span className="flex items-center gap-1 text-helper text-muted">
                  <span aria-hidden>×</span>
                  {t("tryAgain")}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
