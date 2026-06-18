/* ===========================================================================
   Legacy preferences reader (G9) — one-time localStorage → DB backfill.
   ---------------------------------------------------------------------------
   The Notifications and Sound toggles moved to DB columns in G9
   (lib/preferences-actions.ts). This module is kept ONLY to migrate values a
   client persisted under the old G8 localStorage key: read the explicit value
   (null if the user never set it), backfill it through the server action, then
   clear the key. Once every client has loaded once post-G9, this module and the
   key can be removed. Client-only: every function no-ops without `window`.
=========================================================================== */

export type PreferenceKey = "notifications" | "sound";

const KEY = "stap:preferences";

/**
 * The value a client explicitly stored for `key` under the legacy key, or null
 * if none was ever stored (so an unset toggle is not mistaken for `false`).
 */
export function readLegacyPreference(key: PreferenceKey): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const obj = (parsed ?? {}) as Partial<Record<PreferenceKey, unknown>>;
    return typeof obj[key] === "boolean" ? (obj[key] as boolean) : null;
  } catch {
    return null;
  }
}

/** Remove the legacy key after a successful backfill. */
export function clearLegacyPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Unreadable storage — nothing to clear.
  }
}
