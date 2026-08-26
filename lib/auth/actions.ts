"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getLocale } from "next-intl/server";

import { APP_HOME } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// Passwordless sign-in. One `signInWithOtp` call emails BOTH a link (a
// token_hash verified by /auth/confirm) and a numeric code verified here —
// two renderings of the same one-shot token, so whichever is used first wins.
// The code's length is a dashboard setting (8 digits today), so nothing here
// or in the UI assumes one.
//
// The code is not a fallback: it is the only path that works inside an
// installed iOS web app. iOS never opens a link in a home-screen app, and
// that app has its own cookie container, so a link followed in Safari signs
// the user into the wrong browser (see docs/decisions/0005-sign-in-code.md).
// We never handle a password.

export type SignInEmailState = {
  status: "idle" | "sent" | "error";
  /** Address the code went to — carried into the verification step. */
  email?: string;
};

export type VerifyCodeState = {
  status: "idle" | "error";
};

// Origin of the current deployment, used to build an absolute
// emailRedirectTo (Supabase requires an absolute URL on the allow-list).
async function resolveOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// useActionState reducer: (prevState, formData) => nextState.
export async function requestSignInCode(
  _prev: SignInEmailState,
  formData: FormData,
): Promise<SignInEmailState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { status: "error" };

  const locale = await getLocale();
  const origin = await resolveOrigin();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // The email template appends `&token_hash=...&type=email` to this.
      // /auth/confirm reads `next`, so the link lands on the same app home
      // the code path does.
      emailRedirectTo: `${origin}/auth/confirm?next=/${locale}${APP_HOME}`,
    },
  });

  if (error) return { status: "error", email };
  return { status: "sent", email };
}

export async function verifySignInCode(
  _prev: VerifyCodeState,
  formData: FormData,
): Promise<VerifyCodeState> {
  const email = String(formData.get("email") ?? "").trim();
  // Tolerate what a paste or an autofill brings along (spaces, dashes).
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!email || !token) return { status: "error" };

  const supabase = await createClient();

  // `email` is the type for both codes this flow can produce — the magic-link
  // one sent to a known address and the confirm-signup one sent to a new
  // address (verified against the project's auth server, not assumed). So
  // there is nothing to branch on: whether the account already existed is
  // none of the sign-in screen's business.
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) return { status: "error" };

  // verifyOtp wrote the session cookies onto this action's response; the
  // redirect that follows is the first request to carry them. Land on the app
  // home, not the welcome screen — signing in IS entering the app, so there is
  // nothing left to click.
  const locale = await getLocale();
  redirect(`/${locale}${APP_HOME}`);
}

export async function signOut() {
  const locale = await getLocale();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
