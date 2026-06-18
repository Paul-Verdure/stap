import { getTranslations } from "next-intl/server";

import { StatusPill, Tag } from "@/components/ui/surface";
import { Helper } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { GAME_IDS, gameRoute, type GameId } from "@/lib/games";

/* ===========================================================================
   GameCardList (G7.1, DB-backed in G9) — the hub's three game cells.
   ---------------------------------------------------------------------------
   Individual ink-bordered cells separated by gap (the VocItem list pattern —
   never a gray separator list). A played card recedes (page-background
   surface) and carries the amber "Already played" pill — NEVER a green check,
   and it stays a link: games are freely replayable, no score.

   Server component: the played set is read from the DB (game_plays) by the hub
   page and passed in, so the pills are correct on first paint — no hydration
   pop, no client store. The mark-played write is a server action.
=========================================================================== */

export async function GameCardList({ played }: { played: GameId[] }) {
  const t = await getTranslations("Games");

  return (
    <ul className="flex list-none flex-col gap-3 p-0">
      {GAME_IDS.map((id) => {
        const isPlayed = played.includes(id);
        return (
          <li key={id}>
            <Link
              href={gameRoute(id)}
              className={cn(
                "border-structural flex flex-col gap-1 rounded-md px-4 py-3",
                isPlayed ? "bg-background" : "bg-surface",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-body font-semibold text-foreground">
                  {t(`cards.${id}.title`)}
                </span>
                {isPlayed ? (
                  <StatusPill>{t("alreadyPlayed")}</StatusPill>
                ) : (
                  <Tag>{t(`cards.${id}.duration`)}</Tag>
                )}
              </div>
              <Helper as="span">{t(`cards.${id}.desc`)}</Helper>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
