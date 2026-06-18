import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppBar } from "@/components/layout/app-bar";
import { ChallengeCard } from "@/components/challenge/challenge-card";
import { VocCard, VocScroll } from "@/components/challenge/voc-card";
import { Cta } from "@/components/ui/button";
import { countSteps, MiniRhythm } from "@/components/ui/rhythm";
import { Card, StatusPill } from "@/components/ui/surface";
import {
  DateLine,
  Eyebrow,
  Greeting,
  Helper,
  Nl,
  SectionRule,
} from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import {
  getRelatedPhrases,
  getTodayChallenge,
  getUserProfile,
  getWeekRhythm,
} from "@/lib/challenge";

// Home / daily challenge — one route, three states driven by the DB:
//   PENDING  -> State 1 "to do"
//   PREPARED -> State 2 "in preparation"
//   DONE     -> State 3 "done"
// The shell (AppBar + greeting + ChallengeCard) is shared; the greeting,
// in-hero status, actions and footer differ per state.
export default async function TodayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Today");
  const format = await getFormatter();
  const fr = locale === "fr";

  const profile = await getUserProfile();
  if (!profile) {
    // The (app) layout already gates non-onboarded users; this is defensive.
    redirect(`/${locale}/onboarding`);
  }

  const rhythm = await getWeekRhythm(profile.id);
  const name = profile.displayName ?? "";

  const appBar = (
    <AppBar
      right={
        <MiniRhythm
          days={rhythm}
          size="sm"
          ariaLabel={t("weekSteps", { count: countSteps(rhythm) })}
        />
      }
    />
  );

  const challenge = await getTodayChallenge(profile);
  if (!challenge) {
    return (
      <>
        {appBar}
        <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 pb-5">
          <Greeting>{t("greeting", { name })}</Greeting>
          <Helper>{t("noChallenge")}</Helper>
        </main>
      </>
    );
  }

  const { phrase } = challenge;
  const meaning = fr ? phrase.meaningFr : phrase.meaningEn;
  const ctx = phrase.lifeContexts.find((lc) =>
    profile.contextSlugs.includes(lc.lifeContext.slug),
  )?.lifeContext;
  const contextName = ctx ? (fr ? ctx.nameFr : ctx.nameEn) : undefined;

  const isDone = challenge.state === "DONE";
  const isPrepared = challenge.state === "PREPARED";

  // --- Per-state pieces -----------------------------------------------------

  let greeting: ReactNode;
  if (isDone) {
    // Invariant Dutch praise + invariant first name.
    greeting = (
      <Greeting>
        <Nl>Goed gedaan, {name}!</Nl>
      </Greeting>
    );
  } else if (isPrepared) {
    greeting = (
      <Greeting
        sub={
          challenge.preparedAt
            ? format.dateTime(challenge.preparedAt, "time")
            : undefined
        }
      >
        {t("greetingReady", { name })}
      </Greeting>
    );
  } else {
    greeting = (
      <Greeting
        sub={
          <DateLine dateTime={new Date().toISOString()}>
            {format.dateTime(new Date(), "full")}
          </DateLine>
        }
      >
        {t("greeting", { name })}
      </Greeting>
    );
  }

  const status = isDone ? (
    <StatusPill>{t("doneStatus")}</StatusPill>
  ) : isPrepared ? (
    <StatusPill>{t("prepStatus")}</StatusPill>
  ) : undefined;

  const actions = isDone ? (
    <>
      <Cta asChild fullWidth>
        <Link href="/journal">{t("addToJournal")}</Link>
      </Cta>
      <Cta asChild variant="ink" fullWidth>
        <Link href="/games">{t("playRecap")}</Link>
      </Cta>
    </>
  ) : (
    <>
      <Cta asChild fullWidth>
        <Link href="/today/prepare">
          {isPrepared ? t("resumePrep") : t("getReady")}
        </Link>
      </Cta>
      <Cta asChild variant="ink" fullWidth>
        <Link href="/today/validate">{t("markDone")} ✓</Link>
      </Cta>
    </>
  );

  const related = isDone ? [] : await getRelatedPhrases(phrase.id);

  return (
    <>
      {appBar}
      <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 pb-5">
        {greeting}

        <ChallengeCard
          eyebrow={isDone ? t("doneBanner") : t("challengeEyebrow")}
          level={phrase.level}
          context={contextName}
          nl={phrase.textNl}
          translation={meaning}
          status={status}
        />

        <div className="flex flex-col gap-3">{actions}</div>

        {isDone ? (
          <Card padding="md" className="flex flex-col gap-1">
            <Eyebrow>{t("tomorrowTitle")}</Eyebrow>
            <Helper>{t("tomorrowBody")}</Helper>
          </Card>
        ) : (
          related.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionRule>{t("vocabHead")}</SectionRule>
              <VocScroll label={t("vocabHead")}>
                {related.map((p) => (
                  <VocCard
                    key={p.id}
                    nl={p.textNl}
                    meaning={fr ? p.meaningFr : p.meaningEn}
                  />
                ))}
              </VocScroll>
            </section>
          )
        )}
      </main>
    </>
  );
}
