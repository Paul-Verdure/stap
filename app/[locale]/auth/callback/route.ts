import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Magic-link landing point. Supabase appends a PKCE `code` to the configured
// emailRedirectTo; we exchange it for a session (the server client writes the
// auth cookies onto the redirect response) and forward to the intended page.
// On failure we return to the login screen with an error flag.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/today";
  const next = nextParam.startsWith("/") ? nextParam : `/${nextParam}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/${locale}${next}`);
    }
    console.error("exchangeCodeForSession:", error.message);
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=1`);
}
