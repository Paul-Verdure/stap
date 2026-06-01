import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Locale-agnostic machine route — proxy.ts deliberately skips i18n and the
// session refresh for /auth/*. This is the magic-link target: it verifies the
// OTP token_hash, which establishes the session cookies, then redirects to the
// sanitized `next` path. verifyOtp + a next/navigation redirect is the
// documented Supabase SSR pattern (cookies set during the request survive the
// redirect).

function sanitizeNext(raw: string | null): string {
  // Allow only an internal, single-leading-slash path. Reject
  // protocol-relative "//host" to avoid an open redirect.
  if (raw && /^\/(?!\/)/.test(raw)) return raw;
  return `/${routing.defaultLocale}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNext(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      redirect(next);
    }
  }

  redirect(`/${routing.defaultLocale}/login?error=auth`);
}
