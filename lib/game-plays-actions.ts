"use server";

import { revalidatePath } from "next/cache";

import { dateOnlyUTC } from "@/lib/date";
import { db } from "@/lib/db";
import { GAME_IDS, type GameId } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

/* ===========================================================================
   Played-state write (G9) — replaces lib/game-progress.ts markGamePlayed.
   ---------------------------------------------------------------------------
   Called from the game client components the moment a game completes. The day
   is computed server-side (never trust the client), the row is idempotent
   (unique on user/date/game), and the games hub is revalidated so the
   "already played" pill is present when the user navigates back.
=========================================================================== */

export async function markGamePlayed(gameId: GameId): Promise<void> {
  if (!GAME_IDS.includes(gameId)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const date = dateOnlyUTC();
  await db.gamePlay.upsert({
    where: { userId_date_gameId: { userId: user.id, date, gameId } },
    create: { userId: user.id, date, gameId },
    update: {},
  });

  // Refresh the hub so the pill shows on return (both locales).
  revalidatePath("/[locale]/games", "page");
}
