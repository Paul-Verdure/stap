"use server";

import { getCurrentUser } from "@/lib/auth/user";
import { db } from "@/lib/db";

/* ===========================================================================
   Account actions (G8, step 5).
   ---------------------------------------------------------------------------
   exportMyData: the RGPD "export my data" path (decision 3) — a READ-ONLY
   server action scoped to the authenticated user's id (Prisma bypasses RLS,
   so the scope is enforced here). Returns the user's profile, journal and
   challenge history as a plain JSON-serializable object; the client turns it
   into a downloadable file. It never touches another user's rows and writes
   nothing. Account DELETION is deliberately NOT here — it is the step-7
   security stop (stubbed, no service-role secret).
=========================================================================== */

export type ExportResult =
  | { status: "done"; data: AccountExport }
  | { status: "error" };

export type AccountExport = {
  exportedAt: string;
  profile: {
    email: string;
    displayName: string | null;
    uiLocale: string;
    level: string | null;
    frequency: string | null;
    reminderTime: string | null;
    createdAt: string;
    onboardedAt: string | null;
    lifeContexts: string[];
  };
  journal: {
    date: string;
    feeling: string | null;
    phrase: string;
    meaningEn: string;
    meaningFr: string;
    note: string | null;
    heardWords: string[];
    savedAt: string;
  }[];
  challenges: {
    date: string;
    state: string;
    feeling: string | null;
    phrase: string;
  }[];
};

export type DeleteResult = { status: "stubbed" } | { status: "error" };

/**
 * Account deletion — STUBBED (G8 security stop, decision 2). The real flow
 * would call the Supabase admin API with the SERVICE-ROLE secret to delete the
 * auth user, then cascade the DB rows. That secret and the irreversible delete
 * are deliberately NOT wired here, so this NEVER deletes anything and stays
 * safe on the shared seed user. It only confirms a session and returns a
 * "stubbed" marker the UI surfaces honestly. Do not implement the real delete
 * without the user's explicit go-ahead and the service-role secret.
 */
export async function deleteAccount(): Promise<DeleteResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error" };
  // Intentionally a no-op: nothing is deleted.
  return { status: "stubbed" };
}

export async function exportMyData(): Promise<ExportResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error" };

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      displayName: true,
      uiLocale: true,
      level: true,
      frequency: true,
      reminderTime: true,
      createdAt: true,
      onboardedAt: true,
      lifeContexts: { select: { lifeContext: { select: { slug: true } } } },
    },
  });
  if (!profile) return { status: "error" };

  const journal = await db.journalEntry.findMany({
    where: { userId: user.id },
    orderBy: { challenge: { date: "desc" } },
    select: {
      body: true,
      heardWords: true,
      createdAt: true,
      challenge: {
        select: {
          date: true,
          feeling: true,
          phrase: { select: { textNl: true, meaningEn: true, meaningFr: true } },
        },
      },
    },
  });

  const challenges = await db.challenge.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: {
      date: true,
      state: true,
      feeling: true,
      phrase: { select: { textNl: true } },
    },
  });

  const data: AccountExport = {
    exportedAt: new Date().toISOString(),
    profile: {
      email: profile.email,
      displayName: profile.displayName,
      uiLocale: profile.uiLocale,
      level: profile.level,
      frequency: profile.frequency,
      reminderTime: profile.reminderTime,
      createdAt: profile.createdAt.toISOString(),
      onboardedAt: profile.onboardedAt?.toISOString() ?? null,
      lifeContexts: profile.lifeContexts.map((c) => c.lifeContext.slug),
    },
    journal: journal.map((e) => ({
      date: e.challenge.date.toISOString().slice(0, 10),
      feeling: e.challenge.feeling,
      phrase: e.challenge.phrase.textNl,
      meaningEn: e.challenge.phrase.meaningEn,
      meaningFr: e.challenge.phrase.meaningFr,
      note: e.body,
      heardWords: e.heardWords,
      savedAt: e.createdAt.toISOString(),
    })),
    challenges: challenges.map((c) => ({
      date: c.date.toISOString().slice(0, 10),
      state: c.state,
      feeling: c.feeling,
      phrase: c.phrase.textNl,
    })),
  };

  return { status: "done", data };
}
