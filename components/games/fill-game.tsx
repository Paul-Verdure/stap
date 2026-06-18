"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { EndScreen } from "@/components/games/end-screen";
import { FillPhrase } from "@/components/games/fill-phrase";
import { OptionStack } from "@/components/games/option-stack";
import { ProgressDots } from "@/components/games/progress-dots";
import { RecapBlock, RecapRow } from "@/components/games/recap-block";
import { Cta } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { markGamePlayed } from "@/lib/game-plays-actions";
import type { FillOption, FillRound } from "@/lib/game-content";
import { gameRoute, nextGameId } from "@/lib/games";

/* ===========================================================================
   FillGame (G7.4) — "The right word". Three rounds; each blanks the last word
   of a Dutch phrase and offers three choices. A wrong choice turns dashed
   "× try again" and stays tappable — no penalty, no score. The right choice
   advances. Progress is announced via aria-live; ProgressDots mirror it.
=========================================================================== */
export function FillGame({
  rounds,
}: {
  rounds: FillRound[];
}) {
  const t = useTranslations("Games");

  const [roundIndex, setRoundIndex] = useState(0);
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);

  function handlePick(option: FillOption) {
    if (!option.correct) {
      if (!wrongWords.includes(option.word)) {
        setWrongWords([...wrongWords, option.word]);
      }
      setStatus(t("tryAgain"));
      return;
    }
    const isLast = roundIndex === rounds.length - 1;
    setWrongWords([]);
    if (isLast) {
      setDone(true);
      void markGamePlayed("fill");
      setStatus(t("fill.allDone"));
    } else {
      setRoundIndex(roundIndex + 1);
      setStatus(t("fill.nextRound"));
    }
  }

  if (done) {
    const next = nextGameId("fill");
    return (
      <EndScreen
        doneLabel={t("end.doneChip")}
        title={t("fill.endTitle")}
        subtitle={t("fill.endSubtitle")}
        recap={
          <RecapBlock title={t("fill.recapTitle")}>
            {rounds.map((r) => (
              <RecapRow key={r.id}>
                <span className="font-display text-body" lang="nl">
                  {r.prefix}
                  <span className="mx-0.5 inline-flex items-center rounded-sm bg-accent px-1.5 py-0.5 font-semibold text-on-accent">
                    {r.answer}
                  </span>
                  {r.suffix}
                </span>
              </RecapRow>
            ))}
          </RecapBlock>
        }
        actions={
          <>
            {next ? (
              <Cta asChild fullWidth>
                <Link href={gameRoute(next)}>{t("nextGame")}</Link>
              </Cta>
            ) : null}
            <Cta asChild variant="ink" fullWidth>
              <Link href="/games">{t("backToGames")}</Link>
            </Cta>
          </>
        }
      />
    );
  }

  const round = rounds[roundIndex];

  return (
    <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 pb-5">
      <div className="flex items-center justify-between gap-3">
        <ProgressDots total={rounds.length} doneCount={roundIndex} />
        <p className="text-helper text-muted" aria-live="polite">
          {t("roundProgress", { current: roundIndex + 1, total: rounds.length })}
        </p>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      <FillPhrase
        clue={round.clue}
        prefix={round.prefix}
        suffix={round.suffix}
        blankLabel={t("fill.blankLabel")}
      />

      <OptionStack
        key={round.id}
        options={round.options}
        wrongWords={wrongWords}
        onPick={handlePick}
      />
    </main>
  );
}
