"use server";

import { headers } from "next/headers";

import { routing } from "@/i18n/routing";
import { normalizeCode } from "@/lib/auth/code";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  type DutchLevel,
  type Frequency,
  type OnboardingPayload,
} from "@/lib/onboarding";
import { DEFAULT_TIMEZONE, isValidTimezone } from "@/lib/timezone";

// Outcome of requesting the sign-up email. Unlike the login flow this one
// creates the account (shouldCreateUser), since onboarding IS sign-up.
export type StartState = { status: "idle" | "sent" | "error" };

// Outcome of verifying the code from that email.
export type VerifyState = { status: "verified" | "error" };

async function resolveOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function safeLocale(locale: string) {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

export async function requestOnboardingCode(
  email: string,
  locale: string,
): Promise<StartState> {
  const clean = email.trim();
  if (!clean) return { status: "error" };

  const origin = await resolveOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: {
      shouldCreateUser: true,
      // The link lands back on onboarding (authenticated) and the flow
      // finalizes from there. It is the desktop shortcut; the code in the
      // same email is the path that also works inside the installed iOS app,
      // which cannot follow a link into itself at all (ADR 0005).
      emailRedirectTo: `${origin}/auth/confirm?next=/${safeLocale(locale)}/onboarding`,
    },
  });

  if (error) {
    console.error("onboarding signInWithOtp:", error.message);
    return { status: "error" };
  }
  return { status: "sent" };
}

// Verifies the code from that email. Deliberately does NOT redirect the way
// the sign-in action does: sign-up is only half done here — the answers are
// still sitting in the browser, and completeOnboarding below is what turns
// this session into an account. The flow calls the two in sequence, so the
// cookies verifyOtp writes here are already on the next request.
//
// `type: "email"` is right for a confirm-signup token as well as a magic-link
// one (verified against this project's auth server, see ADR 0005), so a
// returning address and a brand-new one take the same path.
export async function verifyOnboardingCode(
  email: string,
  code: string,
): Promise<VerifyState> {
  const clean = email.trim();
  const token = normalizeCode(code);
  if (!clean || !token) return { status: "error" };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: clean,
    token,
    type: "email",
  });
  if (error) return { status: "error" };

  return { status: "verified" };
}

const LEVELS: DutchLevel[] = ["A0", "A1", "A2", "B1", "B2"];
const FREQUENCIES: Frequency[] = ["DAILY", "THREE_PER_WEEK", "OWN_PACE"];

export type CompleteState = { status: "done" | "error" };

export async function completeOnboarding(
  payload: OnboardingPayload,
): Promise<CompleteState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error" };

  // Server-side validation (defense in depth — never trust the client).
  const name = payload.firstName.trim();
  if (
    !name ||
    !LEVELS.includes(payload.level) ||
    !FREQUENCIES.includes(payload.frequency) ||
    payload.contexts.length < 1 ||
    payload.contexts.length > 4
  ) {
    return { status: "error" };
  }

  // Map the selected slugs to catalog ids (ignores any unknown slug).
  const ctx = await db.lifeContext.findMany({
    where: { slug: { in: payload.contexts } },
    select: { id: true },
  });

  // Prisma connects as the table owner (bypasses RLS); we scope every write to
  // the authenticated user's id. Reset the context selection then write the
  // profile + the join rows atomically.
  await db.$transaction([
    db.userLifeContext.deleteMany({ where: { userId: user.id } }),
    db.user.update({
      where: { id: user.id },
      data: {
        displayName: name,
        uiLocale: safeLocale(payload.locale) as "en" | "fr",
        level: payload.level,
        frequency: payload.frequency,
        reminderTime: payload.reminderTime,
        // A zone the sender cannot resolve would break the reminder query for
        // everyone, so an unrecognized one falls back rather than being stored.
        timezone: isValidTimezone(payload.timezone)
          ? payload.timezone
          : DEFAULT_TIMEZONE,
        onboardedAt: new Date(),
        lifeContexts: { create: ctx.map((c) => ({ lifeContextId: c.id })) },
      },
    }),
  ]);

  return { status: "done" };
}
