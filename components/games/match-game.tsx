"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { EndScreen } from "@/components/games/end-screen";
import { Cta } from "@/components/ui/button";
import { Nl } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { markGamePlayed } from "@/lib/game-progress";
import type { MatchTile } from "@/lib/game-content";
import { gameRoute, nextGameId } from "@/lib/games";

/* ===========================================================================
   MatchGame (G7.2) — "Upside down". Tap a tile, then its partner.
   ---------------------------------------------------------------------------
   No score, no timer, no penalty: a wrong pairing just resets to neutral (no
   red — the palette has no semantic red anyway). State carries SHAPE, not
   colour alone: a matched pair is "shelved" (dashed border + strikethrough +
   dimmed); selection is the hero inversion (a luminance change) plus
   aria-pressed. Progress and matched/try-again are announced via aria-live.
=========================================================================== */
export function MatchGame({
  tiles,
  todayIso,
}: {
  tiles: MatchTile[];
  /** UTC day key for the per-day played marker. */
  todayIso: string;
}) {
  const t = useTranslations("Games");

  const total = tiles.length / 2;
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const done = matched.length === total;

  function handleTile(tile: MatchTile) {
    if (matched.includes(tile.pairId)) return; // shelved — inert
    if (selected === tile.key) {
      setSelected(null); // tapping the selected tile deselects it
      return;
    }
    if (selected === null) {
      setSelected(tile.key);
      return;
    }
    const first = tiles.find((x) => x.key === selected);
    if (first && first.pairId === tile.pairId && first.side !== tile.side) {
      const next = [...matched, tile.pairId];
      setMatched(next);
      setSelected(null);
      setStatus(t("match.matched"));
      if (next.length === total) markGamePlayed(todayIso, "match");
    } else {
      // Wrong pairing — no penalty, just clear the selection.
      setSelected(null);
      setStatus(t("match.tryAgain"));
    }
  }

  if (done) {
    const next = nextGameId("match");
    return (
      <EndScreen
        doneLabel={t("end.doneChip")}
        title={t("match.endTitle")}
        subtitle={t("match.endSubtitle")}
        actions={
          <>
            {next ? (
              <Cta asChild fullWidth>
                <Link href={gameRoute(next)}>{t("nextGame")}</Link>
              </Cta>
            ) : null}
            <Cta asChild variant="ink" fullWidth>
              <Link href="/games">{t("backToGames")}</Link>
            </Cta>
          </>
        }
      />
    );
  }

  return (
    <main id="main-content" className="flex flex-1 flex-col gap-5 px-5 pb-5">
      <p className="text-helper text-muted">{t("match.instruction")}</p>

      <p className="text-helper text-muted" aria-live="polite">
        {t("match.progress", { done: matched.length, total })}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      <ul className="grid list-none grid-cols-2 gap-3 p-0">
        {tiles.map((tile) => {
          const isMatched = matched.includes(tile.pairId);
          const isSelected = selected === tile.key;
          return (
            <li key={tile.key}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-disabled={isMatched}
                onClick={() => handleTile(tile)}
                className={cn(
                  "flex min-h-[4.5rem] w-full items-center justify-center rounded-md px-3 py-3 text-center text-body",
                  isMatched
                    ? "border-dashed-ink bg-transparent text-muted line-through opacity-60"
                    : isSelected
                      ? "surface-hero"
                      : "border-structural bg-surface text-foreground",
                )}
              >
                {tile.side === "nl" ? <Nl>{tile.text}</Nl> : tile.text}
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
