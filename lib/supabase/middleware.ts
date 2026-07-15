import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

// Refreshes the Supabase auth session and writes the updated auth cookies
// onto an EXISTING response — here, the response produced by the next-intl
// middleware (which may carry a locale redirect/rewrite and the NEXT_LOCALE
// cookie). We deliberately do not create a fresh NextResponse.next() so that
// the i18n routing decision and its Set-Cookie headers are preserved.
//
// It also enforces route protection: protected-by-default, with a small
// public whitelist (paths below are matched after the locale prefix is
// stripped). The welcome entry ("/") and the design-system gallery are public
// portfolio surfaces; the magic-link screen ("/login") and the offline page
// complete the list. The /auth/* machine route is bypassed earlier in proxy.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/onboarding",
  "/design-system",
  "/~offline",
];

function isPublic(rest: string) {
  return PUBLIC_PATHS.some((p) => rest === p || rest.startsWith(`${p}/`));
}

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

  // IMPORTANT: do not run any logic between createServerClient and
  // getClaims(). A simple mistake here can make sessions hard to debug
  // (random logouts).
  //
  // getClaims() cryptographically verifies the JWT signature — it does not
  // just trust the cookie — so it is as safe as getUser() for this gate. The
  // difference is where verification happens: once the Supabase project is
  // switched to an asymmetric signing key (dashboard-only change, see
  // docs/auth-setup.md), verification runs locally via WebCrypto and the
  // JWKS is cached for 10 minutes, so most requests skip the auth-server
  // round trip entirely — this runs on EVERY matched request, including
  // prefetches. Until that switch happens, the SDK falls back to an
  // getUser()-equivalent network call automatically, so this is safe to ship
  // ahead of the dashboard change.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  // next-intl runs first and (localePrefix: "always") redirects "/" ->
  // "/<locale>". For that redirect the path has no known locale yet, so we
  // defer to it (carried by `response`) and re-evaluate on the next request.
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const locale = segments[0];
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return response;
  }

  const rest = `/${segments.slice(1).join("/")}`;

  // Issue a redirect while carrying over the freshly refreshed auth cookies.
  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  // Unauthenticated access to a non-public path -> localized login.
  if (!user && !isPublic(rest)) {
    return redirectTo(`/${locale}/login`);
  }

  // An authenticated user has no reason to see the login page.
  if (user && rest === "/login") {
    return redirectTo(`/${locale}`);
  }

  return response;
}
