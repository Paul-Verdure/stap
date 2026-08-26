// The routing rules the proxy enforces, kept pure (no request, no response,
// no auth server) so they can be read and tested on their own. Every path
// here is what is left after the locale prefix is stripped: "/fr/today" is
// "/today".
//
// Protected by default, with a small public whitelist. The welcome entry
// ("/") and the design-system gallery are public portfolio surfaces; the
// sign-in screen ("/login"), the sign-up flow ("/onboarding") and the offline
// page complete the list. "/legal" must stay public: app stores and logged-out
// visitors have to be able to read the privacy policy without an account, and
// a consent document behind a sign-in wall is worth nothing. The /auth/*
// machine route is bypassed earlier in proxy.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/onboarding",
  "/design-system",
  "/legal",
  "/~offline",
];

// The two doors into the app. They exist to get a visitor a session; once
// there is one they have nothing left to offer, and "/" is also the PWA
// start_url — so leaving a signed-in user on either costs an extra tap on
// every launch and after every sign-in.
const ENTRY_PATHS = ["/", "/login"];

/** First screen of the app itself. */
export const APP_HOME = "/today";

export function isPublic(rest: string) {
  return PUBLIC_PATHS.some((p) => rest === p || rest.startsWith(`${p}/`));
}

/**
 * Where this request belongs, or `null` to let it through untouched.
 * Onboarding is deliberately not decided here: it needs the profile row, so
 * the (app) layout owns that gate and sends a half-signed-up user on from
 * APP_HOME.
 */
export function routeFor(
  authenticated: boolean,
  rest: string,
  locale: string,
): string | null {
  if (!authenticated) return isPublic(rest) ? null : `/${locale}/login`;
  return ENTRY_PATHS.includes(rest) ? `/${locale}${APP_HOME}` : null;
}
