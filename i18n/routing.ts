import { defineRouting } from "next-intl/routing";

/** next-intl's own cookie name, spelled out so proxy.ts can look for it. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

// UI locales: English (default) and French. Dutch is the *learning target*,
// never a UI language, so it is intentionally absent here.
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  // Always prefix the URL with the locale (/en, /fr). "/" redirects to the
  // locale the proxy resolves.
  localePrefix: "always",
  // Kept on for the NEXT_LOCALE cookie, which is how a chosen language
  // persists. The Accept-Language half of it is neutralized in proxy.ts: the
  // front door opens in English until someone has actually chosen.
  localeDetection: true,
  localeCookie: { name: LOCALE_COOKIE },
});

export type Locale = (typeof routing.locales)[number];
