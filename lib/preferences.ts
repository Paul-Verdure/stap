/* ===========================================================================
   Client preferences (G8, step 4) — localStorage, one JSON key.
   ---------------------------------------------------------------------------
   The Notifications and Sound & audio toggles have no DB column (the prisma
   CLI is quarantined, so no migration). Decided with the user 2026-06-15:
   persist them client-side, exactly like the G7 played-state precedent.
   KNOWN DEBT: move to real columns once the CLI is usable — see
   docs/migration-debt.md. Dark mode is NOT here; it persists via useTheme.

   Client-only: every function no-ops without `window`. The raw string is the
   stable useSyncExternalStore snapshot; a custom event makes same-tab writes
   reactive (the native `storage` event only fires in OTHER tabs).
=========================================================================== */

export type PreferenceKey = "notifications" | "sound";

const KEY = "stap:preferences";
const CHANGE_EVENT = "stap:preferences-change";

// Sensible opt-out defaults: both on until the user turns them off.
const DEFAULTS: Record<PreferenceKey, boolean> = {
  notifications: true,
  sound: true,
};

/** Raw stored value — a string so it is a stable snapshot. */
export function getPreferencesRaw(): string {
  if (typeof window === "undefined") return "{}";
  try {
    return window.localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

/** Parse a raw value into the full preference set, falling back to defaults. */
export function parsePreferences(raw: string): Record<PreferenceKey, boolean> {
  try {
    const parsed: unknown = JSON.parse(raw);
    const obj = (parsed ?? {}) as Partial<Record<PreferenceKey, unknown>>;
    return {
      notifications:
        typeof obj.notifications === "boolean"
          ? obj.notifications
          : DEFAULTS.notifications,
      sound: typeof obj.sound === "boolean" ? obj.sound : DEFAULTS.sound,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Subscribe to same-tab writes and cross-tab storage changes. */
export function subscribeToPreferences(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Persist one preference and notify same-tab subscribers. */
export function setPreference(key: PreferenceKey, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...parsePreferences(getPreferencesRaw()), [key]: value };
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked — the toggle just won't persist. Never throw.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
