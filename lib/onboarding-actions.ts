"use server";

import { headers } from "next/headers";

import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  type DutchLevel,
  type Frequency,
  type OnboardingPayload,
} from "@/lib/onboarding";

// Outcome of requesting the onboarding magic link. Unlike the login flow this
// one creates the account (shouldCreateUser), since onboarding IS sign-up.
export type StartState = { status: "idle" | "sent" | "error" };

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

export async function requestOnboardingLink(
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
      // Land back on onboarding (authenticated); the flow then finalizes.
      emailRedirectTo: `${origin}/auth/confirm?next=/${safeLocale(locale)}/onboarding`,
    },
  });

  if (error) {
    console.error("onboarding signInWithOtp:", error.message);
    return { status: "error" };
  }
  return { status: "sent" };
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
        onboardedAt: new Date(),
        lifeContexts: { create: ctx.map((c) => ({ lifeContextId: c.id })) },
      },
    }),
  ]);

  return { status: "done" };
}
