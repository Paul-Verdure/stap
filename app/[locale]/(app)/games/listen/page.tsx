import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { GameShell } from "@/components/games/game-shell";
import { ListenGame } from "@/components/games/listen-game";
import {
  getRelatedPhrases,
  getTodayChallenge,
  getUserProfile,
} from "@/lib/challenge";
import { dateOnlyUTC, isoDate } from "@/lib/date";
import { buildListenRounds, type ListenSource } from "@/lib/game-content";
import { gamePosition, GAME_IDS } from "@/lib/games";

// Game C — "A sharp ear" (Listen). Reachable only when today's challenge is
// DONE. Variants come from the day's phrase + its same-theme neighbours. The
// phrases keep their audio path (null across the catalog today → the game's
// honest degraded state).
export default async function ListenPage({
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
  const related = await getRelatedPhrases(phrase.id, 5);
  const sources: ListenSource[] = [
    {
      id: phrase.id,
      nl: phrase.textNl,
      meaning: fr ? phrase.meaningFr : phrase.meaningEn,
      audioPath: phrase.audioUrl,
    },
    ...related.map((p) => ({
      id: p.id,
      nl: p.textNl,
      meaning: fr ? p.meaningFr : p.meaningEn,
      audioPath: p.audioUrl,
    })),
  ];

  const todayIso = isoDate(dateOnlyUTC());
  const rounds = buildListenRounds(sources, `${profile.id}:${todayIso}:listen`);
  if (rounds.length < 1) redirect(`/${locale}/games`);

  return (
    <GameShell
      position={gamePosition("listen")}
      total={GAME_IDS.length}
      title={t("cards.listen.title")}
      counterLabel={t("counterLabel", {
        position: gamePosition("listen"),
        total: GAME_IDS.length,
      })}
      closeLabel={t("close")}
    >
      <ListenGame rounds={rounds} todayIso={todayIso} />
    </GameShell>
  );
}
