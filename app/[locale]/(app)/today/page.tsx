import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { AppBar } from "@/components/layout/app-bar";
import { ChallengeCard } from "@/components/challenge/challenge-card";
import { VocCard, VocScroll } from "@/components/challenge/voc-card";
import { Cta } from "@/components/ui/button";
import { countSteps, MiniRhythm } from "@/components/ui/rhythm";
import { DateLine, Greeting, Helper, SectionRule } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import {
  getRelatedPhrases,
  getTodayChallenge,
  getUserProfile,
  getWeekRhythm,
} from "@/lib/challenge";

// Home / daily challenge. G4 renders State 1 (to do) from real data; States 2
// (in preparation) and 3 (done) are layered on in the next steps, driven by
// the challenge state in the DB.
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
  const now = new Date();

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
          <Greeting>{t("greeting", { name: profile.displayName ?? "" })}</Greeting>
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

  const related = await getRelatedPhrases(phrase.id);

  return (
    <>
      {appBar}
      <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 pb-5">
        <Greeting
          sub={
            <DateLine dateTime={now.toISOString()}>
              {format.dateTime(now, "full")}
            </DateLine>
          }
        >
          {t("greeting", { name: profile.displayName ?? "" })}
        </Greeting>

        <ChallengeCard
          eyebrow={t("challengeEyebrow")}
          level={phrase.level}
          context={contextName}
          nl={phrase.textNl}
          translation={meaning}
        />

        <div className="flex flex-col gap-3">
          <Cta asChild fullWidth>
            <Link href="/today/prepare">{t("getReady")}</Link>
          </Cta>
          <Cta asChild variant="ink" fullWidth>
            <Link href="/today/validate">{t("markDone")} ✓</Link>
          </Cta>
        </div>

        {related.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionRule>{t("vocabHead")}</SectionRule>
            <VocScroll>
              {related.map((p) => (
                <VocCard
                  key={p.id}
                  nl={p.textNl}
                  meaning={fr ? p.meaningFr : p.meaningEn}
                />
              ))}
            </VocScroll>
          </section>
        )}
      </main>
    </>
  );
}
