"use server";

import { db } from "@/lib/db";
import {
  FREQUENCIES,
  LEVELS,
  MAX_CONTEXTS,
  REMINDER_SLOTS,
  type DutchLevel,
  type Frequency,
} from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

/* ===========================================================================
   Profile "My setup" writes (G8) — mirror the onboarding completeOnboarding
   pattern: re-authenticate on the server, validate defensively (never trust
   the client), and scope every write to the authenticated user's id (Prisma
   connects as the table owner and bypasses RLS). All four write columns that
   already exist (added by 20260602075757_onboarding_profile_fields) — no
   migration needed, so the prisma-CLI quarantine does not block this.
=========================================================================== */

export type SetupResult = { status: "done" | "error" };

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function updateLevel(level: DutchLevel): Promise<SetupResult> {
  const userId = await currentUserId();
  if (!userId) return { status: "error" };
  if (!LEVELS.includes(level)) return { status: "error" };

  await db.user.update({ where: { id: userId }, data: { level } });
  return { status: "done" };
}

export async function updateContexts(slugs: string[]): Promise<SetupResult> {
  const userId = await currentUserId();
  if (!userId) return { status: "error" };
  if (slugs.length < 1 || slugs.length > MAX_CONTEXTS) return { status: "error" };

  // Map slugs to catalog ids (ignores any unknown slug); refuse an empty match.
  const ctx = await db.lifeContext.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  });
  if (ctx.length === 0) return { status: "error" };

  // Reset the selection then re-create the join rows atomically.
  await db.$transaction([
    db.userLifeContext.deleteMany({ where: { userId } }),
    db.userLifeContext.createMany({
      data: ctx.map((c) => ({ userId, lifeContextId: c.id })),
    }),
  ]);
  return { status: "done" };
}

export async function updateLocale(locale: "en" | "fr"): Promise<SetupResult> {
  const userId = await currentUserId();
  if (!userId) return { status: "error" };
  if (locale !== "en" && locale !== "fr") return { status: "error" };

  await db.user.update({ where: { id: userId }, data: { uiLocale: locale } });
  return { status: "done" };
}

export async function updateFrequency(
  frequency: Frequency,
  reminderTime: string | null,
): Promise<SetupResult> {
  const userId = await currentUserId();
  if (!userId) return { status: "error" };
  if (!FREQUENCIES.includes(frequency)) return { status: "error" };

  // "Own pace" forces the reminder off; otherwise only a canonical slot or null.
  const reminder = frequency === "OWN_PACE" ? null : reminderTime;
  if (reminder !== null && !(REMINDER_SLOTS as readonly string[]).includes(reminder)) {
    return { status: "error" };
  }

  await db.user.update({
    where: { id: userId },
    data: { frequency, reminderTime: reminder },
  });
  return { status: "done" };
}
