"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/* ===========================================================================
   Preference writes (G9) — replaces the G8 localStorage store.
   ---------------------------------------------------------------------------
   The Notifications and Sound toggles now persist in dedicated User columns.
   Re-authenticate on the server and scope the write to the authenticated
   user's id (Prisma bypasses RLS). notificationsEnabled additionally gates
   whether a Web Push subscription is kept active (G9 step 3).
=========================================================================== */

export type PreferenceKey = "notifications" | "sound";
export type PreferenceResult = { status: "done" | "error" };

export async function updatePreference(
  key: PreferenceKey,
  value: boolean,
): Promise<PreferenceResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error" };

  const data =
    key === "notifications"
      ? { notificationsEnabled: value }
      : key === "sound"
        ? { soundEnabled: value }
        : null;
  if (!data) return { status: "error" };

  await db.user.update({ where: { id: user.id }, data });

  // Refresh the profile so the stored value flows back as a prop (this is what
  // surfaces a one-time localStorage backfill without a client setState).
  revalidatePath("/[locale]/profile", "page");
  return { status: "done" };
}
