import "server-only";

import { createTranslator } from "next-intl";
import webpush from "web-push";

import { db } from "@/lib/db";
import type { Frequency } from "@/lib/onboarding";
import { isReminderDue } from "@/lib/reminders";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/* ===========================================================================
   Daily-reminder sender (G9) — server-only Web Push delivery.
   ---------------------------------------------------------------------------
   Configured lazily from the VAPID env vars; if the private key (a secret) is
   absent it no-ops, so a deploy without the keys is safe — push simply stays
   dormant. Reminders are non-judgmental ("waiting", never "missed") and deep
   link to the user's localized /today. Expired subscriptions (404/410) are
   pruned.

   TIMEZONES: `reminderTime` is a LOCAL slot in the user's own `timezone`, so
   Postgres converts `now()` per row with `AT TIME ZONE` (DST included, without
   a date library) and lib/reminders.ts decides who is owed a reminder. The
   route fires every hour — 24 daily cron jobs in vercel.json, which is what
   the Hobby plan allows: a cap of one run per job per day, not a cap on jobs.
   Nothing here is coupled to those hours any more; adding or removing one only
   changes how often the sender gets to look.

   Not losing a day is the reason for `lastRemindedOn`. Hobby cron firings land
   anywhere inside their hour and can be skipped altogether, so the sender
   accepts a slot that passed up to CATCH_UP_MINUTES ago and records the local
   date it sent on. A missed firing is caught by the next one; a user is never
   reminded twice in one local day.
=========================================================================== */

const MESSAGES = { en, fr } as const;
type Locale = keyof typeof MESSAGES;

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

function reminderPayload(locale: Locale): string {
  const t = createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: "Push",
  });
  return JSON.stringify({
    title: t("reminderTitle"),
    body: t("reminderBody"),
    url: `/${locale}/today`,
    tag: "stap-reminder",
  });
}

type SubRow = { endpoint: string; p256dh: string; auth: string };

// Send one payload to all of a user's devices; prune any that are gone.
async function sendToSubscriptions(
  subs: SubRow[],
  payload: string,
): Promise<{ sent: number; pruned: number }> {
  let sent = 0;
  let pruned = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.pushSubscription.deleteMany({
          where: { endpoint: sub.endpoint },
        });
        pruned++;
      }
    }
  }
  return { sent, pruned };
}

/* One candidate for a reminder, with its own local clock resolved by Postgres.
   Only users who could still be reminded today are returned: opted in, with a
   slot and a device, not already reminded in their local day, and not already
   done with today's challenge. */
type DueCandidate = {
  id: string;
  uiLocale: Locale;
  frequency: Frequency;
  reminderTime: string;
  localDate: string;
  localTime: string;
  localDow: number;
};

async function findCandidates(): Promise<DueCandidate[]> {
  // Raw SQL because `AT TIME ZONE` has no Prisma equivalent, and doing the
  // conversion per row in the database is what keeps DST correct for free.
  // The zone comes from a column, never from interpolated input.
  //
  // The "already done" check is deliberately in UTC: `challenges.date` is a
  // UTC day key (lib/date.ts), so this asks the same question the app itself
  // answers on /today. It is the app's day model that is UTC, not this query.
  return db.$queryRaw<DueCandidate[]>`
    SELECT
      u.id,
      u.ui_locale::text                                        AS "uiLocale",
      u.frequency::text                                        AS "frequency",
      u.reminder_time                                          AS "reminderTime",
      to_char(now() AT TIME ZONE u.timezone, 'YYYY-MM-DD')     AS "localDate",
      to_char(now() AT TIME ZONE u.timezone, 'HH24:MI')        AS "localTime",
      EXTRACT(ISODOW FROM now() AT TIME ZONE u.timezone)::int  AS "localDow"
    FROM users u
    WHERE u.notifications_enabled IS TRUE
      AND u.reminder_time IS NOT NULL
      AND u.frequency IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM push_subscriptions s WHERE s.user_id = u.id
      )
      AND (
        u.last_reminded_on IS NULL
        OR u.last_reminded_on <> (now() AT TIME ZONE u.timezone)::date
      )
      AND NOT EXISTS (
        SELECT 1 FROM challenges c
        WHERE c.user_id = u.id
          AND c.state = 'DONE'
          AND c.date = (now() AT TIME ZONE 'UTC')::date
      )
  `;
}

/**
 * Send the daily reminder to every user whose local slot has come up and who
 * has not been reminded yet in their own day. Returns send/prune counts plus
 * how many users were reminded.
 */
export async function sendDueReminders(): Promise<{
  sent: number;
  pruned: number;
  users: number;
}> {
  if (!ensureConfigured()) return { sent: 0, pruned: 0, users: 0 };

  const candidates = await findCandidates();

  let sent = 0;
  let pruned = 0;
  let users = 0;

  for (const user of candidates) {
    const due = isReminderDue({
      localTime: user.localTime,
      isoWeekday: user.localDow,
      slot: user.reminderTime,
      frequency: user.frequency,
    });
    if (!due) continue;

    const subs = await db.pushSubscription.findMany({
      where: { userId: user.id },
      select: { endpoint: true, p256dh: true, auth: true },
    });
    const result = await sendToSubscriptions(subs, reminderPayload(user.uiLocale));
    sent += result.sent;
    pruned += result.pruned;

    // Stamp only on a delivery the push service accepted. A transient failure
    // is therefore retried on the next hourly run, and the catch-up window is
    // what stops that retry from continuing all day.
    if (result.sent > 0) {
      users++;
      await db.user.update({
        where: { id: user.id },
        data: { lastRemindedOn: new Date(`${user.localDate}T00:00:00.000Z`) },
      });
    }
  }

  return { sent, pruned, users };
}

/**
 * Send the reminder to a single user immediately, ignoring cadence/schedule.
 * Used for manual sends and verification.
 */
export async function sendReminderToUser(
  userId: string,
): Promise<{ sent: number; pruned: number }> {
  if (!ensureConfigured()) return { sent: 0, pruned: 0 };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      uiLocale: true,
      pushSubscriptions: { select: { endpoint: true, p256dh: true, auth: true } },
    },
  });
  if (!user) return { sent: 0, pruned: 0 };

  return sendToSubscriptions(
    user.pushSubscriptions,
    reminderPayload(user.uiLocale),
  );
}
