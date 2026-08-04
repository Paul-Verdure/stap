import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { ChallengeCard } from "@/components/challenge/challenge-card";
import { PhraseCard } from "@/components/challenge/phrase-card";
import { VocItem } from "@/components/challenge/voc-item";
import { TopBar } from "@/components/layout/top-bar";
import { Cta } from "@/components/ui/button";
import { Tag } from "@/components/ui/surface";
import { Helper, Nl, SectionHead } from "@/components/ui/typography";
import { markPrepared } from "@/lib/challenge-actions";
import {
  getRelatedPhrases,
  getTodayChallenge,
  getUserProfile,
  userContextName,
} from "@/lib/challenge";
import { localize } from "@/lib/localize";

// Preparation — single scrollable screen, sticky commitment CTA, no bottom nav
// (focus mode). Sections: hero recap, the situation, key words, the sentence,
// and collapsible tips. Audio is wired (disabled until clips are synced). The
// commit write lands in G5.3.
export default async function PreparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Prepare");
  const nav = await getTranslations("Nav");

  const profile = await getUserProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const challenge = await getTodayChallenge(profile);
  if (!challenge) redirect(`/${locale}/today`);

  const { phrase } = challenge;
  const meaning = localize(phrase, "meaning", locale);
  const contextName = userContextName(phrase, profile.contextSlugs, locale);

  const keyWords = await getRelatedPhrases(phrase.id);
  // Situation and tips are per-phrase catalog content (Phase H), not the
  // product-wide placeholder copy they used to be.
  const situation = localize(phrase, "situation", locale);
  const tips = localize(phrase, "tips", locale);
  // The reply trio is all-or-nothing in the database (phrases_reply_complete),
  // so requiring both halves here costs nothing and keeps the types honest.
  const replyMeaning = localize(phrase, "replyMeaning", locale);
  const reply =
    phrase.replyNl && replyMeaning
      ? { nl: phrase.replyNl, meaning: replyMeaning }
      : null;

  return (
    <>
      <TopBar title={t("title")} backHref="/today" backLabel={nav("back")} />

      <main id="main-content" className="flex-1 px-5 pb-28">
        <div className="flex flex-col gap-6">
          <ChallengeCard
            eyebrow={t("recapEyebrow")}
            level={phrase.level}
            context={contextName}
            nl={phrase.textNl}
            translation={meaning}
          />

          {/* The situation — the phrase's own scenario + meta tags. */}
          <section className="flex flex-col gap-3">
            <SectionHead title={t("situationTitle")} nl="de situatie" />
            <Helper>{situation}</Helper>
            <div className="flex flex-wrap gap-2">
              <Tag tone="amber">{phrase.level}</Tag>
              {contextName ? <Tag>{contextName}</Tag> : null}
              {/* NEUTRAL is the default and says nothing useful — only the
                  je/u commitment is worth a tag. */}
              {phrase.register !== "NEUTRAL" ? (
                <Tag>{t(`register.${phrase.register}`)}</Tag>
              ) : null}
            </div>
          </section>

          {/* Key words — related catalog phrases with word-scale audio. */}
          {keyWords.length > 0 && (
            <section className="flex flex-col gap-2">
              <SectionHead title={t("keywordsTitle")} nl="de sleutelwoorden" />
              <div className="flex flex-col gap-2">
                {keyWords.map((p) => (
                  <VocItem
                    key={p.id}
                    nl={p.textNl}
                    meaning={localize(p, "meaning", locale)}
                    audioPath={p.audioUrl}
                  />
                ))}
              </div>
            </section>
          )}

          {/* The sentence — phrase card with phonetic strip + audio. */}
          <section className="flex flex-col gap-3">
            <SectionHead title={t("sentenceTitle")} nl="de zin" />
            <PhraseCard
              nl={phrase.textNl}
              phonetic={localize(phrase, "phonetic", locale)}
              meaning={meaning}
              audioPath={phrase.audioUrl}
            />
          </section>

          {/* What comes back — knowing the likely answer is what keeps the
              exchange from stalling after the rehearsed line. */}
          {reply && (
            <section className="flex flex-col gap-2">
              <SectionHead title={t("replyTitle")} nl="het antwoord" />
              <VocItem nl={reply.nl} meaning={reply.meaning} />
            </section>
          )}

          {/* Tips — native collapsible (keyboard + AT friendly). */}
          <section>
            <details className="border-structural rounded-md bg-surface">
              <summary className="flex cursor-pointer items-baseline gap-2 px-4 py-3">
                <span className="font-display text-greeting">
                  {t("tipsTitle")}
                </span>
                <Nl className="text-body text-muted">tips</Nl>
              </summary>
              <ol className="flex flex-col gap-3 px-4 pb-4">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-helper font-bold text-on-accent"
                    >
                      {i + 1}
                    </span>
                    <span className="text-body">{tip}</span>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        </div>
      </main>

      {/* Sticky commitment bar — a footer landmark so all content is in a
          landmark (a11y). The write lands in G5.3. */}
      <footer className="sticky bottom-0 border-t-[1.5px] border-foreground bg-background px-5 py-4">
        <form action={markPrepared}>
          <Cta type="submit" variant="commitment" fullWidth>
            {t("commit")}
          </Cta>
        </form>
        <Helper className="mt-2 text-center">{t("commitNudge")}</Helper>
      </footer>
    </>
  );
}
