import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { ContextBanner } from "@/components/games/context-banner";
import { GameCardList } from "@/components/games/game-card-list";
import { ReviewWiderLink } from "@/components/games/review-wider-link";
import { TopBar } from "@/components/layout/top-bar";
import { Helper } from "@/components/ui/typography";
import { getTodayChallenge, getUserProfile } from "@/lib/challenge";
import { dateOnlyUTC, isoDate } from "@/lib/date";

// Games hub (G7.1) — the warm recap of the day. Renders only when today's
// challenge is DONE (the games replay something the user actually did);
// otherwise the locked state (G7.6) takes over. SKIPPED is not an attempt.
export default async function GamesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Games");
  const fr = locale === "fr";

  const profile = await getUserProfile();
  if (!profile) {
    // The (app) layout already gates non-onboarded users; this is defensive.
    redirect(`/${locale}/onboarding`);
  }

  const challenge = await getTodayChallenge(profile);

  if (challenge?.state !== "DONE") {
    // Placeholder until G7.6 builds the real locked state.
    return (
      <>
        <TopBar title={t("title")} />
        <main id="main-content" className="flex-1 px-5 pb-5">
          <Helper>{t("placeholder")}</Helper>
        </main>
      </>
    );
  }

  const { phrase } = challenge;
  const ctx = phrase.lifeContexts.find((lc) =>
    profile.contextSlugs.includes(lc.lifeContext.slug),
  )?.lifeContext;

  return (
    <>
      <TopBar title={t("title")} />
      <main
        id="main-content"
        className="flex flex-1 flex-col gap-5 px-5 pb-5"
      >
        <ContextBanner
          eyebrow={t("contextEyebrow")}
          nl={phrase.textNl}
          translation={fr ? phrase.meaningFr : phrase.meaningEn}
          context={ctx ? (fr ? ctx.nameFr : ctx.nameEn) : undefined}
        />

        <section className="flex flex-col gap-3">
          <Helper>{t("pickAny")}</Helper>
          <GameCardList todayIso={isoDate(dateOnlyUTC())} />
        </section>

        <ReviewWiderLink />
      </main>
    </>
  );
}
