import "server-only";

import { dateOnlyUTC } from "@/lib/date";
import { db } from "@/lib/db";
import { GAME_IDS, type GameId } from "@/lib/games";

/* ===========================================================================
   Played-state reads (G9) — DB-backed, replaces the G7 localStorage store.
   ---------------------------------------------------------------------------
   The "already played" pills are a daily, ephemeral signal: one game_plays row
   per (user, UTC day, game). Server-only; Prisma bypasses RLS, so every read is
   scoped to the passed user id. Returned in canonical GAME_IDS order.
=========================================================================== */

/** The game ids the user has played today (UTC day). */
export async function getPlayedGamesToday(userId: string): Promise<GameId[]> {
  const rows = await db.gamePlay.findMany({
    where: { userId, date: dateOnlyUTC() },
    select: { gameId: true },
  });
  const played = new Set(rows.map((r) => r.gameId));
  return GAME_IDS.filter((id) => played.has(id));
}
