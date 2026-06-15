"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { StatusPill, Tag } from "@/components/ui/surface";
import { Helper } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import {
  getPlayedGamesRaw,
  parsePlayedGames,
  subscribeToPlayedGames,
} from "@/lib/game-progress";
import { GAME_IDS, gameRoute, type GameId } from "@/lib/games";

/* ===========================================================================
   GameCardList + GameCard (G7.1) — the hub's three game cells.
   ---------------------------------------------------------------------------
   Individual ink-bordered cells separated by gap (the VocItem list pattern —
   never a gray separator list). A played card recedes (page-background
   surface) and carries the amber "Already played" pill — NEVER a green
   check, and it stays a link: games are freely replayable, no score.

   Client component: the played state lives in localStorage (per-day key,
   see lib/game-progress.ts). It is read after mount, so the server render
   shows every card as unplayed and the pills pop in on hydration — fine for
   a daily-reset signal.
=========================================================================== */

export function GameCardList({ todayIso }: { todayIso: string }) {
  // localStorage is the external store; the raw string is the snapshot (a
  // stable reference), parsed memoized. Server snapshot = nothing played.
  const raw = useSyncExternalStore(
    subscribeToPlayedGames,
    () => getPlayedGamesRaw(todayIso),
    () => "[]",
  );
  const played = useMemo(() => parsePlayedGames(raw), [raw]);

  return (
    <ul className="flex list-none flex-col gap-3 p-0">
      {GAME_IDS.map((id) => (
        <li key={id}>
          <GameCard id={id} played={played.includes(id)} />
        </li>
      ))}
    </ul>
  );
}

function GameCard({ id, played }: { id: GameId; played: boolean }) {
  const t = useTranslations("Games");

  return (
    <Link
      href={gameRoute(id)}
      className={cn(
        "border-structural flex flex-col gap-1 rounded-md px-4 py-3",
        played ? "bg-background" : "bg-surface",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-body font-semibold text-foreground">
          {t(`cards.${id}.title`)}
        </span>
        {played ? (
          <StatusPill>{t("alreadyPlayed")}</StatusPill>
        ) : (
          <Tag>{t(`cards.${id}.duration`)}</Tag>
        )}
      </div>
      <Helper as="span">{t(`cards.${id}.desc`)}</Helper>
    </Link>
  );
}
