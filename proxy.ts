import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renamed the `middleware` file convention to `proxy` (middleware.ts
// is deprecated). This runs on every matched request, before rendering.
//
// Composition order matters:
//   1. The locale is decided and may produce a redirect/rewrite ("/" -> "/en",
//      sets the NEXT_LOCALE cookie). We take that response as the base.
//   2. Supabase refreshes the auth session and writes its cookies ONTO that
//      same response, so neither the locale decision nor the session is lost.
const handleI18nRouting = createMiddleware(routing);

// The front door opens in English, whatever language the browser asks for.
//
// next-intl resolves a locale in four steps: the URL prefix, the NEXT_LOCALE
// cookie, the Accept-Language header, then the default. Only the third one is
// unwanted here, and `localeDetection: false` would switch off the cookie with
// it — which is the one that has to keep working, since it is what carries a
// chosen language across a launch from the home screen ("/" every time).
//
// So the header step is skipped by hand: an unprefixed path with no recorded
// choice goes straight to the default locale. The app is its own language
// switch (onboarding screen 0, and the Profile), and until someone has used
// it there is no reason to guess — a welcome screen is read by more people
// than the browser's language list represents.
function defaultLocaleRedirect(request: NextRequest) {
  if (request.cookies.has(LOCALE_COOKIE)) return null;

  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (routing.locales.includes(first as (typeof routing.locales)[number])) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${routing.defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  // Locale-agnostic machine route (magic-link email confirm). No i18n
  // redirect and no session refresh here — app/auth/confirm establishes the
  // session itself via verifyOtp.
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  const response = defaultLocaleRedirect(request) ?? handleI18nRouting(request);
  return await updateSession(request, response);
}

export const config = {
  // Skip Next internals and anything with a file extension (this also
  // excludes /manifest.webmanifest and the /serwist/*.js service worker
  // files, which must not be locale-redirected).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
