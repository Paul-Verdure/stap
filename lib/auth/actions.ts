"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";

// Magic-link sign-in flow (passwordless, aligned with Stap's low-friction
// philosophy). signInWithOtp emails a token_hash; the /auth/confirm route
// verifies it. We never handle a password.

export type MagicLinkState = {
  status: "idle" | "sent" | "error";
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
export async function requestMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
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
      // /auth/confirm reads `next` to land the user on their locale.
      emailRedirectTo: `${origin}/auth/confirm?next=/${locale}`,
    },
  });

  if (error) return { status: "error" };
  return { status: "sent" };
}

export async function signOut() {
  const locale = await getLocale();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
