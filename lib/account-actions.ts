"use server";

import { redirect } from "next/navigation";

import { getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth/user";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/* ===========================================================================
   Account actions.
   ---------------------------------------------------------------------------
   exportMyData: the RGPD "export my data" path (G8, decision 3) — a READ-ONLY
   server action scoped to the authenticated user's id (Prisma bypasses RLS,
   so the scope is enforced here). Returns the user's profile, journal and
   challenge history as a plain JSON-serializable object; the client turns it
   into a downloadable file. It never touches another user's rows and writes
   nothing.

   deleteAccount: the irreversible counterpart. Stubbed from G8 until the
   semantics were settled; see ADR 0003 for why it hard-deletes.
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

// Only the failure path returns: a successful delete redirects instead.
export type DeleteResult = { status: "error" };

/**
 * Account deletion — irreversible hard delete (ADR 0003).
 *
 * Deletes the **auth identity**, never the mirror row directly: the
 * `on_auth_user_deleted` trigger (migration `auth_user_sync`) removes
 * `public.users`, and every user-owned relation cascades from there —
 * challenges, journal entries, vocabulary cards, daily activities, seasonal
 * reviews, life-context links, game plays, push subscriptions. Deleting the
 * Prisma row instead would leave the auth identity behind, and the next magic
 * link would silently recreate an empty account.
 *
 * The service-role client is required here (the admin API is the only way to
 * remove an auth user) and is server-only — see lib/supabase/admin.ts.
 */
export async function deleteAccount(): Promise<DeleteResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error" };

  const locale = await getLocale();

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { status: "error" };

  // Clear the session cookies. `scope: "local"` skips the server-side logout
  // call, which would fail anyway now that the identity is gone — the point is
  // to drop the JWT, which stays signature-valid until it expires even though
  // it no longer resolves to a row.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  // Outside any try/catch: redirect() signals by throwing.
  redirect(`/${locale}/login?deleted=1`);
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
