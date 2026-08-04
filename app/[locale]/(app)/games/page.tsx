import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { ContextBanner } from "@/components/games/context-banner";
import { GameCardList } from "@/components/games/game-card-list";
import { LockedState } from "@/components/games/locked-state";
import { ReviewWiderLink } from "@/components/games/review-wider-link";
import { TopBar } from "@/components/layout/top-bar";
import { Helper } from "@/components/ui/typography";
import {
  getTodayChallenge,
  getUserProfile,
  userContextName,
} from "@/lib/challenge";
import { getPlayedGamesToday } from "@/lib/game-plays";
import { localize } from "@/lib/localize";

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
  const profile = await getUserProfile();
  if (!profile) {
    // The (app) layout already gates non-onboarded users; this is defensive.
    redirect(`/${locale}/onboarding`);
  }

  // Fetched in parallel: the played set is only rendered when the challenge
  // is DONE, but paying one small extra query on the locked state is cheaper
  // than serializing the two round-trips on the common path.
  const [challenge, played] = await Promise.all([
    getTodayChallenge(profile),
    getPlayedGamesToday(profile.id),
  ]);

  // The games replay the day, so they open only once today's challenge is
  // DONE; otherwise the locked state guards the tab (SKIPPED is not a step).
  if (challenge?.state !== "DONE") {
    return <LockedState />;
  }

  const { phrase } = challenge;
  const contextName = userContextName(phrase, profile.contextSlugs, locale);

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
          translation={localize(phrase, "meaning", locale)}
          context={contextName}
        />

        <section className="flex flex-col gap-3">
          <Helper>{t("pickAny")}</Helper>
          <GameCardList played={played} />
        </section>

        <ReviewWiderLink />
      </main>
    </>
  );
}
