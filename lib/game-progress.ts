import type { GameId } from "@/lib/games";

/* ===========================================================================
   Played-state persistence (G7) — localStorage, one key per UTC day.
   ---------------------------------------------------------------------------
   Decided while the prisma CLI is quarantined (no migration possible): a
   per-day localStorage key is an honest store for a signal that resets every
   day anyway. KNOWN DEBT: replace with a `game_plays` table (and delete this
   module) once the CLI is usable again.

   Client-only: callers live in client components ("use client"); every
   function no-ops without `window` so accidental server imports stay safe.
=========================================================================== */

const KEY_PREFIX = "stap:games-played:";

function keyFor(isoDate: string): string {
  return `${KEY_PREFIX}${isoDate}`;
}

/**
 * Raw stored value for `isoDate` (YYYY-MM-DD, UTC — matches the challenge
 * day). A string so it can serve as a stable `useSyncExternalStore` snapshot;
 * parse it with `parsePlayedGames`.
 */
export function getPlayedGamesRaw(isoDate: string): string {
  if (typeof window === "undefined") return "[]";
  try {
    return window.localStorage.getItem(keyFor(isoDate)) ?? "[]";
  } catch {
    return "[]"; // unreadable storage = nothing played; the signal is daily
  }
}

/** Parse a raw stored value into a list of valid game ids. */
export function parsePlayedGames(raw: string): GameId[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is GameId => v === "match" || v === "fill" || v === "listen",
    );
  } catch {
    return [];
  }
}

/** Subscribe to cross-tab storage changes (for `useSyncExternalStore`). */
export function subscribeToPlayedGames(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Record `id` as played on `isoDate`; prunes keys from previous days. */
export function markGamePlayed(isoDate: string, id: GameId): void {
  if (typeof window === "undefined") return;
  try {
    const played = parsePlayedGames(getPlayedGamesRaw(isoDate));
    if (!played.includes(id)) {
      window.localStorage.setItem(
        keyFor(isoDate),
        JSON.stringify([...played, id]),
      );
    }
    pruneOtherDays(isoDate);
  } catch {
    // Storage full or blocked — the pill just won't persist. Never throw.
  }
}

/** Drop played-state keys for any day other than `isoDate`. */
function pruneOtherDays(isoDate: string): void {
  const stale: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(KEY_PREFIX) && key !== keyFor(isoDate)) {
      stale.push(key);
    }
  }
  stale.forEach((key) => window.localStorage.removeItem(key));
}
