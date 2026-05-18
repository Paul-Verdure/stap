import { defineRouting } from "next-intl/routing";

// UI locales: English (default) and French. Dutch is the *learning target*,
// never a UI language, so it is intentionally absent here.
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  // Always prefix the URL with the locale (/en, /fr). "/" redirects to the
  // detected (or default) locale.
  localePrefix: "always",
  // Detect from Accept-Language on first visit, then persist via the
  // NEXT_LOCALE cookie.
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
