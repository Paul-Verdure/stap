"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { countSteps, type RhythmDay } from "@/components/ui/rhythm";
import { getCurrentUser } from "@/lib/auth/user";
import { getWeekRhythm } from "@/lib/challenge";
import { dateOnlyUTC } from "@/lib/date";
import { db } from "@/lib/db";

// Commit to the daily challenge: advance today's challenge PENDING -> PREPARED
// and stamp preparedAt, then return to Home (which renders State 2). updateMany
// (scoped to the user + PENDING) is a safe no-op if the challenge was already
// prepared, done or skipped — it never clobbers a later state.
export async function markPrepared() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  await db.challenge.updateMany({
    where: { userId: user.id, date: dateOnlyUTC(), state: "PENDING" },
    data: { state: "PREPARED", preparedAt: new Date() },
  });

  redirect(`/${locale}/today`);
}

// "No chance today" — a non-attempt. Mark the challenge SKIPPED (the rhythm
// "skip" dot) without recording a feeling or a journal entry, then return
// Home. Only from a not-yet-validated state, so it never overrides a DONE.
export async function markNoChance() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  await db.challenge.updateMany({
    where: {
      userId: user.id,
      date: dateOnlyUTC(),
      state: { in: ["PENDING", "PREPARED"] },
    },
    data: { state: "SKIPPED" },
  });

  redirect(`/${locale}/today`);
}

type Feeling = "AT_EASE" | "HESITANT" | "MISSED";

export type SaveValidationResult =
  | { status: "ok"; rhythm: RhythmDay[]; steps: number }
  | { status: "error" };

// Validate today's challenge: record the feeling, mark it DONE, write the
// journal entry (optional story + free-text heard words) and log the day's
// activity — all in one transaction, scoped to the authenticated user. Returns
// the refreshed weekly rhythm so the confirmation can render its summary.
export async function saveValidation(
  feeling: Feeling,
  story: string,
  heardWords: string[],
): Promise<SaveValidationResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error" };

  const date = dateOnlyUTC();
  const challenge = await db.challenge.findUnique({
    where: { userId_date: { userId: user.id, date } },
    select: { id: true },
  });
  if (!challenge) return { status: "error" };

  const body = story.trim() || null;
  const words = heardWords
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 20);

  await db.$transaction([
    db.challenge.update({
      where: { id: challenge.id },
      data: { state: "DONE", feeling, validatedAt: new Date() },
    }),
    db.journalEntry.upsert({
      where: { challengeId: challenge.id },
      create: { userId: user.id, challengeId: challenge.id, body, heardWords: words },
      update: { body, heardWords: words },
    }),
    db.dailyActivity.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date },
      update: {},
    }),
  ]);

  const rhythm = await getWeekRhythm(user.id);
  return { status: "ok", rhythm, steps: countSteps(rhythm) };
}
