/* ===========================================================================
   Game registry (G7) — the three daily micro-games, in their canonical
   A → B → C order. Pure and isomorphic: route building and sequencing live
   here so the hub, the shell and the end screens never hand-roll them.
=========================================================================== */

export const GAME_IDS = ["match", "fill", "listen"] as const;
export type GameId = (typeof GAME_IDS)[number];

/** Locale-relative route of a game (next-intl Link adds the locale). */
export function gameRoute(id: GameId): string {
  return `/games/${id}`;
}

/** The game after `id` in the A → B → C sequence, or null after the last. */
export function nextGameId(id: GameId): GameId | null {
  const index = GAME_IDS.indexOf(id);
  return GAME_IDS[index + 1] ?? null;
}

/** 1-based position of a game in the sequence — feeds the "1/3" counter. */
export function gamePosition(id: GameId): number {
  return GAME_IDS.indexOf(id) + 1;
}
