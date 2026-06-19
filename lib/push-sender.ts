import "server-only";

import { createTranslator } from "next-intl";
import webpush from "web-push";

import { dateOnlyUTC } from "@/lib/date";
import { db } from "@/lib/db";
import { ChallengeFrequency, ChallengeState } from "@/lib/generated/prisma/enums";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/* ===========================================================================
   Daily-reminder sender (G9) — server-only Web Push delivery.
   ---------------------------------------------------------------------------
   Configured lazily from the VAPID env vars; if the private key (a secret) is
   absent it no-ops, so a deploy without the keys is safe — push simply stays
   dormant. Reminders are non-judgmental ("waiting", never "missed") and deep
   link to the user's localized /today. Expired subscriptions (404/410) are
   pruned. Cadence: DAILY every day, THREE_PER_WEEK on Mon/Wed/Fri; OWN_PACE
   never (its reminderTime is null). The cron runs once a day (Vercel Hobby
   allows only daily crons), so every due user is reminded at that single run
   regardless of their chosen reminderTime slot — honoring the exact slot needs
   a more frequent scheduler (v2 / Vercel Pro), see docs/roadmap-and-deployment.
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

/**
 * Send the daily reminder to every user due today: opted in, due by their
 * cadence (DAILY, or THREE_PER_WEEK on Mon/Wed/Fri), not already done today,
 * and with at least one subscription. Meant to be called by the once-a-day
 * cron. Returns send/prune counts.
 */
export async function sendDueReminders(
  now: Date = new Date(),
): Promise<{ sent: number; pruned: number; users: number }> {
  if (!ensureConfigured()) return { sent: 0, pruned: 0, users: 0 };

  const day = now.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const isMwf = day === 1 || day === 3 || day === 5;
  const today = dateOnlyUTC(now);

  // The cron fires once a day, so every opted-in user due by cadence is sent
  // at this single run (no per-hour slot match). notificationsEnabled implies a
  // reminder was set; OWN_PACE is excluded by the frequency filter.
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      notificationsEnabled: true,
      frequency: isMwf
        ? { in: [ChallengeFrequency.DAILY, ChallengeFrequency.THREE_PER_WEEK] }
        : ChallengeFrequency.DAILY,
      pushSubscriptions: { some: {} },
      // Don't nag someone who already did today's challenge.
      challenges: { none: { date: today, state: ChallengeState.DONE } },
    },
    select: {
      uiLocale: true,
      pushSubscriptions: { select: { endpoint: true, p256dh: true, auth: true } },
    },
  });

  let sent = 0;
  let pruned = 0;
  for (const user of users) {
    const result = await sendToSubscriptions(
      user.pushSubscriptions,
      reminderPayload(user.uiLocale),
    );
    sent += result.sent;
    pruned += result.pruned;
  }
  return { sent, pruned, users: users.length };
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
