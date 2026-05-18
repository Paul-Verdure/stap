import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";

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
  await supabase.auth.getUser();

  // No auth-gating / redirect logic yet (scaffolding only).
  return response;
}
