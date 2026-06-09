"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { FeelCard, type FeelKind } from "@/components/challenge/feel-card";
import { VocabField } from "@/components/challenge/vocab-field";
import { Cta, SecondaryLink } from "@/components/ui/button";
import { Textarea } from "@/components/ui/text-field";
import { Question, SectionHead } from "@/components/ui/typography";

// Validation "Tell me" — collects the feeling (required), an optional story and
// the words heard. The recap is rendered server-side and passed in. Saving and
// the "no chance" path are wired in the next steps; here the CTA gates on the
// feeling and the no-chance link is present and distinct.
export function ValidateForm({ recap }: { recap: ReactNode }) {
  const t = useTranslations("Validate");
  const [feeling, setFeeling] = useState<FeelKind | null>(null);
  const [story, setStory] = useState("");
  const [words, setWords] = useState<string[]>([]);

  const canSave = feeling !== null;

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
        <Cta variant="commitment" fullWidth disabled={!canSave}>
          {t("save")}
        </Cta>
      </footer>
    </>
  );
}
