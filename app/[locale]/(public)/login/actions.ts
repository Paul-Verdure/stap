"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

// Result of a magic-link request. Deliberately enumeration-safe: a valid
// email always yields `sent`, whether or not an account exists, so the UI
// cannot be used to probe which addresses are registered. Only a malformed
// email returns `invalid`.
export type LoginState =
  | { status: "idle" }
  | { status: "invalid" }
  | { status: "sent"; email: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en");

  if (!EMAIL_RE.test(email)) {
    return { status: "invalid" };
  }

  // Build the absolute callback URL from the request origin. The magic link
  // lands here with a PKCE `code`; the callback exchanges it for a session.
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const emailRedirectTo = `${origin}/${locale}/auth/callback?next=/today`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // "I already have an account" — never create a new user from this entry.
      shouldCreateUser: false,
      emailRedirectTo,
    },
  });

  if (error) {
    // Log for diagnostics but do not surface to the client: revealing the
    // difference between "sent" and "no such account" leaks who is registered.
    console.error("signInWithOtp:", error.message);
  }

  return { status: "sent", email };
}
