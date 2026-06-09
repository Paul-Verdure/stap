"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/user";
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
