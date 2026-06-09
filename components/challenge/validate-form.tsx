"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { FeelCard, type FeelKind } from "@/components/challenge/feel-card";
import { StreakBox } from "@/components/challenge/streak-box";
import { VocabField } from "@/components/challenge/vocab-field";
import { Cta, SecondaryLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/text-field";
import { Question, SectionHead } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import {
  saveValidation,
  type SaveValidationResult,
} from "@/lib/challenge-actions";

const FEEL_MESSAGE: Record<FeelKind, string> = {
  AT_EASE: "savedAtEase",
  HESITANT: "savedHesitant",
  MISSED: "savedMissed",
};

export function ValidateForm({ recap }: { recap: ReactNode }) {
  const t = useTranslations("Validate");
  const tToday = useTranslations("Today");
  const tt = t as unknown as (key: string) => string;

  const [feeling, setFeeling] = useState<FeelKind | null>(null);
  const [story, setStory] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState<
    Extract<SaveValidationResult, { status: "ok" }> | null
  >(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation heading on the transition (a11y contract).
  useEffect(() => {
    if (done) headingRef.current?.focus();
  }, [done]);

  const handleSave = async () => {
    if (!feeling || pending) return;
    setPending(true);
    setError(false);
    const res = await saveValidation(feeling, story, words);
    setPending(false);
    if (res.status === "ok") setDone(res);
    else setError(true);
  };

  // --- Confirmation (same route, client transition) ------------------------

  if (done && feeling) {
    return (
      <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 py-8">
        <div role="status" aria-live="polite" className="flex flex-col gap-5">
          <StatusPill className="self-start">{t("savedChip")}</StatusPill>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-question text-balance outline-none"
          >
            {tt(FEEL_MESSAGE[feeling])}
          </h2>
          <StreakBox
            rhythm={done.rhythm}
            steps={done.steps}
            label={t("weekLabel")}
            rhythmAria={tToday("weekSteps", { count: done.steps })}
            delta="+1"
          />
          <div className="mt-2 flex flex-col gap-3">
            <Cta asChild fullWidth>
              <Link href="/games">{t("playRecap")}</Link>
            </Cta>
            <Cta asChild variant="ink" fullWidth>
              <Link href="/today">{t("backHome")}</Link>
            </Cta>
          </div>
        </div>
      </main>
    );
  }

  // --- Form ----------------------------------------------------------------

  const canSave = feeling !== null && !pending;

  return (
    <>
      <main id="main-content" className="flex-1 px-5 pb-28">
        <div className="flex flex-col gap-6 pt-2">
          {recap}

          <section className="flex flex-col gap-3">
            <Question as="h2">{t("howWasIt")}</Question>
            <div className="flex gap-2">
              <FeelCard
                kind="AT_EASE"
                label={t("atEase")}
                selected={feeling === "AT_EASE"}
                onClick={() => setFeeling("AT_EASE")}
              />
              <FeelCard
                kind="HESITANT"
                label={t("hesitant")}
                selected={feeling === "HESITANT"}
                onClick={() => setFeeling("HESITANT")}
              />
              <FeelCard
                kind="MISSED"
                label={t("missedIt")}
                selected={feeling === "MISSED"}
                onClick={() => setFeeling("MISSED")}
              />
            </div>
            {/* Non-attempt — a quieter, distinct action (wired in G5.6). */}
            <SecondaryLink className="self-center">{t("noChance")}</SecondaryLink>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHead title={t("storyTitle")} nl="jouw verhaal" />
            <Textarea
              label={t("storyTitle")}
              hideLabel
              maxLength={280}
              placeholder={t("storyPlaceholder")}
              value={story}
              onChange={(e) => setStory(e.target.value)}
            />
          </section>

          <section className="flex flex-col gap-3">
            <SectionHead title={t("wordsTitle")} nl="gehoorde woorden" />
            <VocabField
              value={words}
              onChange={setWords}
              addLabel={t("wordsAdd")}
              placeholder={t("wordsPlaceholder")}
              removeLabel={t("wordsRemove")}
            />
          </section>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t-[1.5px] border-foreground bg-background px-5 py-4">
        {error && (
          <p role="alert" className="mb-2 text-center text-helper text-muted">
            {t("saveError")}
          </p>
        )}
        <Cta
          variant="commitment"
          fullWidth
          disabled={!canSave}
          onClick={handleSave}
        >
          {t("save")}
        </Cta>
      </footer>
    </>
  );
}
