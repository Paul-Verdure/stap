"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  isValidPreference,
  resolveTheme,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// --- localStorage source --------------------------------------------------
// We treat the stored preference and the system media-query as external
// stores and read them through useSyncExternalStore. This is the React 19
// idiomatic pattern for cross-tab/cross-source state and avoids setState
// inside effects.

const STORAGE_EVENT = "storage";
const PREF_CHANGE_EVENT = "stap:theme-pref-change";

function subscribePreference(callback: () => void): () => void {
  window.addEventListener(STORAGE_EVENT, callback);
  window.addEventListener(PREF_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener(STORAGE_EVENT, callback);
    window.removeEventListener(PREF_CHANGE_EVENT, callback);
  };
}

function readPreference(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidPreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

function readPreferenceServer(): ThemePreference {
  return "system";
}

// --- matchMedia source ----------------------------------------------------

function subscribeSystemDark(callback: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function readSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readSystemDarkServer(): boolean {
  return false;
}

// --------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore(
    subscribePreference,
    readPreference,
    readPreferenceServer,
  );

  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemDark,
    readSystemDark,
    readSystemDarkServer,
  );

  const resolved = useMemo(
    () => resolveTheme(preference, systemPrefersDark),
    [preference, systemPrefersDark],
  );

  // Mirror the resolved theme to <html data-theme> so the CSS variables swap.
  useEffect(() => {
    const root = document.documentElement;
    if (resolved === "dark") root.setAttribute(THEME_ATTRIBUTE, "dark");
    else root.removeAttribute(THEME_ATTRIBUTE);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode, quota): notify subscribers anyway.
    }
    window.dispatchEvent(new Event(PREF_CHANGE_EVENT));
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark");
  }, [resolved, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider />");
  return ctx;
}
