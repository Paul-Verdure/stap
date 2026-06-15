import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { GameShell } from "@/components/games/game-shell";
import { MatchGame } from "@/components/games/match-game";
import {
  getRelatedPhrases,
  getTodayChallenge,
  getUserProfile,
} from "@/lib/challenge";
import { dateOnlyUTC, isoDate } from "@/lib/date";
import { buildMatchTiles, type MatchPair } from "@/lib/game-content";
import { gamePosition, GAME_IDS } from "@/lib/games";

// Game A — "Upside down" (Match). Like the hub, only reachable once today's
// challenge is DONE; otherwise back to the hub (which guards with the locked
// state). Pairs come from the day's phrase + its same-theme neighbours.
export default async function MatchPage({
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
  // Three same-theme neighbours → four pairs total. The pool is comfortably
  // larger than three (verified); if a theme were ever too small the game
  // simply renders the pairs it can build (min two).
  const related = await getRelatedPhrases(phrase.id, 3);
  const pairs: MatchPair[] = [
    { id: phrase.id, nl: phrase.textNl, meaning: fr ? phrase.meaningFr : phrase.meaningEn },
    ...related.map((p) => ({
      id: p.id,
      nl: p.textNl,
      meaning: fr ? p.meaningFr : p.meaningEn,
    })),
  ];
  if (pairs.length < 2) redirect(`/${locale}/games`);

  const todayIso = isoDate(dateOnlyUTC());
  const tiles = buildMatchTiles(pairs, `${profile.id}:${todayIso}:match`);

  return (
    <GameShell
      position={gamePosition("match")}
      total={GAME_IDS.length}
      title={t("cards.match.title")}
      counterLabel={t("counterLabel", {
        position: gamePosition("match"),
        total: GAME_IDS.length,
      })}
      closeLabel={t("close")}
    >
      <MatchGame pairs={pairs} tiles={tiles} todayIso={todayIso} />
    </GameShell>
  );
}
