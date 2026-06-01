import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

// Path prefixes (after the locale segment) that require an authenticated
// session — the (app) route group. Everything else (the public welcome entry,
// /design-system, /~offline) is open.
const PROTECTED_PREFIXES = ["/today", "/journal", "/games", "/profile"];

function isProtected(pathWithoutLocale: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) =>
      pathWithoutLocale === prefix ||
      pathWithoutLocale.startsWith(`${prefix}/`),
  );
}

// Refreshes the Supabase auth session and writes the updated auth cookies
// onto an EXISTING response — here, the response produced by the next-intl
// middleware (which may carry a locale redirect/rewrite and the NEXT_LOCALE
// cookie). We deliberately do not create a fresh NextResponse.next() so that
// the i18n routing decision and its Set-Cookie headers are preserved.
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // IMPORTANT: do not run any logic between createServerClient and getUser().
  // A simple mistake here can make sessions hard to debug (random logouts).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth boundary for the (app) route group. The locale prefix is always
  // present by the time we get here: un-prefixed paths are redirected by the
  // next-intl middleware first, then re-enter through this proxy.
  const segments = request.nextUrl.pathname.split("/");
  const maybeLocale = segments[1];
  const hasKnownLocale = (routing.locales as readonly string[]).includes(
    maybeLocale,
  );

  if (hasKnownLocale && !user) {
    const pathWithoutLocale = `/${segments.slice(2).join("/")}`;
    if (isProtected(pathWithoutLocale)) {
      // Send unauthenticated visitors to the magic-link reconnect screen for
      // this locale.
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${maybeLocale}/login`;
      redirectUrl.search = "";

      // Carry over every cookie the i18n + Supabase steps wrote (locale +
      // refreshed auth) so the redirect doesn't drop the session decision.
      const redirect = NextResponse.redirect(redirectUrl);
      response.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie);
      });
      return redirect;
    }
  }

  return response;
}
