import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { FillGame } from "@/components/games/fill-game";
import { GameShell } from "@/components/games/game-shell";
import {
  getRelatedPhrases,
  getTodayChallenge,
  getUserProfile,
} from "@/lib/challenge";
import { dateOnlyUTC, isoDate } from "@/lib/date";
import { buildFillRounds, type MatchPair } from "@/lib/game-content";
import { gamePosition, GAME_IDS } from "@/lib/games";

// Game B — "The right word" (Fill). Reachable only when today's challenge is
// DONE. Rounds come from the day's phrase + its same-theme neighbours; the
// neighbours also seed the distractor pool.
export default async function FillPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Games");
  const fr = locale === "fr";

  const profile = await getUserProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const challenge = await getTodayChallenge(profile);
  if (challenge?.state !== "DONE") redirect(`/${locale}/games`);

  const { phrase } = challenge;
  // Five neighbours give three rounds plus a comfortable distractor pool.
  const related = await getRelatedPhrases(phrase.id, 5);
  const phrases: MatchPair[] = [
    { id: phrase.id, nl: phrase.textNl, meaning: fr ? phrase.meaningFr : phrase.meaningEn },
    ...related.map((p) => ({
      id: p.id,
      nl: p.textNl,
      meaning: fr ? p.meaningFr : p.meaningEn,
    })),
  ];

  const todayIso = isoDate(dateOnlyUTC());
  const rounds = buildFillRounds(phrases, `${profile.id}:${todayIso}:fill`);
  if (rounds.length < 1) redirect(`/${locale}/games`);

  return (
    <GameShell
      position={gamePosition("fill")}
      total={GAME_IDS.length}
      title={t("cards.fill.title")}
      counterLabel={t("counterLabel", {
        position: gamePosition("fill"),
        total: GAME_IDS.length,
      })}
      closeLabel={t("close")}
    >
      <FillGame rounds={rounds} />
    </GameShell>
  );
}
