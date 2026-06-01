import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renamed the `middleware` file convention to `proxy` (middleware.ts
// is deprecated). This runs on every matched request, before rendering.
//
// Composition order matters:
//   1. next-intl computes the locale and may redirect/rewrite ("/" -> "/en",
//      sets the NEXT_LOCALE cookie). We take its response as the base.
//   2. Supabase refreshes the auth session and writes its cookies ONTO that
//      same response, so neither the locale decision nor the session is lost.
const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // Locale-agnostic machine route (magic-link email confirm). No i18n
  // redirect and no session refresh here — app/auth/confirm establishes the
  // session itself via verifyOtp.
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  const response = handleI18nRouting(request);
  return await updateSession(request, response);
}

export const config = {
  // Skip Next internals and anything with a file extension (this also
  // excludes /manifest.webmanifest and the /serwist/*.js service worker
  // files, which must not be locale-redirected).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
