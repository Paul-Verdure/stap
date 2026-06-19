"use server";

import { db } from "@/lib/db";
import type { PushSubscriptionPayload } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

/* ===========================================================================
   Push subscription writes (G9) — persist / remove a device's subscription.
   ---------------------------------------------------------------------------
   Called by the Notifications toggle after the browser subscribe/unsubscribe.
   Re-authenticate on the server and scope every write to the authenticated
   user (Prisma bypasses RLS). One row per endpoint (a user may have several
   devices); the row is owned by whoever last subscribed that endpoint.
=========================================================================== */

export type PushResult = { status: "done" | "error" };

export async function savePushSubscription(
  sub: PushSubscriptionPayload,
): Promise<PushResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error" };
  if (!sub?.endpoint || !sub.p256dh || !sub.auth) return { status: "error" };

  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
    update: { userId: user.id, p256dh: sub.p256dh, auth: sub.auth },
  });
  return { status: "done" };
}

export async function removePushSubscription(
  endpoint: string,
): Promise<PushResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error" };

  // Scoped to the user so one device cannot delete another account's row.
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { status: "done" };
}
