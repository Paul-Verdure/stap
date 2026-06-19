"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AudioButton } from "@/components/challenge/audio-button";
import { EndScreen } from "@/components/games/end-screen";
import { ListenRow } from "@/components/games/listen-row";
import { OptionStack } from "@/components/games/option-stack";
import { ProgressDots } from "@/components/games/progress-dots";
import { RecapBlock, RecapRow } from "@/components/games/recap-block";
import { Cta } from "@/components/ui/button";
import { Nl } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { markGamePlayed } from "@/lib/game-plays-actions";
import type { ListenOption, ListenRound } from "@/lib/game-content";

/* ===========================================================================
   ListenGame (G7.5) — "A sharp ear". Three rounds; each plays a phrase and
   offers three close Dutch variants. The last game, so the end CTA inverts:
   "Back to games" is primary, "Replay" is secondary.

   Audio is degraded honestly: the whole catalog's clips are still null, so
   the disc renders disabled with an "audio coming soon" caption AND the
   round shows the meaning as a fallback clue, keeping the game answerable
   rather than trapping the player. Once audio is synced the disc plays and
   the clue falls away. No score, no penalty, free retry throughout.
=========================================================================== */
export function ListenGame({
  rounds,
}: {
  rounds: ListenRound[];
}) {
  const t = useTranslations("Games");

  const [roundIndex, setRoundIndex] = useState(0);
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);

  function handlePick(option: ListenOption) {
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
      void markGamePlayed("listen");
      setStatus(t("listen.allDone"));
    } else {
      setRoundIndex(roundIndex + 1);
      setStatus(t("listen.nextRound"));
    }
  }

  function replay() {
    setRoundIndex(0);
    setWrongWords([]);
    setStatus("");
    setDone(false);
  }

  if (done) {
    return (
      <EndScreen
        doneLabel={t("end.doneChip")}
        title={t("listen.endTitle")}
        subtitle={t("listen.endSubtitle")}
        recap={
          <RecapBlock title={t("listen.recapTitle")}>
            {rounds.map((r) => (
              <RecapRow key={r.id}>
                <span className="font-display text-body font-semibold">
                  <Nl>{r.answer}</Nl>
                </span>
                <AudioButton
                  audioPath={r.audioPath}
                  scale="word"
                  srLabel={<Nl>{r.answer}</Nl>}
                />
              </RecapRow>
            ))}
          </RecapBlock>
        }
        actions={
          <>
            <Cta asChild fullWidth>
              <Link href="/games">{t("backToGames")}</Link>
            </Cta>
            <Cta variant="ink" fullWidth onClick={replay}>
              {t("listen.replay")}
            </Cta>
          </>
        }
      />
    );
  }

  const round = rounds[roundIndex];
  const degraded = !round.audioPath;

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

      <ListenRow
        audioPath={round.audioPath}
        playLabel={t("listen.playLabel")}
        caption={degraded ? t("listen.comingSoon") : t("listen.replayHint")}
      />

      {degraded ? (
        <p className="text-center text-body text-muted">
          {t("listen.meaningHint", { meaning: round.meaning })}
        </p>
      ) : null}

      <OptionStack
        key={round.id}
        options={round.options}
        wrongWords={wrongWords}
        onPick={handlePick}
      />
    </main>
  );
}
