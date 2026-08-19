import type { Locale } from "@/i18n/routing";

/* ===========================================================================
   Onboarding shared types + client-state contract (G3).
   ---------------------------------------------------------------------------
   The flow is "collect-then-sign-up": all six fields are gathered client-side
   across screens 0–6, mirrored to localStorage so they survive both the
   Screen-0 locale switch (which remounts the tree) and the magic-link
   round-trip, then persisted once a session exists (step 6).
=========================================================================== */

export type DutchLevel = "A0" | "A1" | "A2" | "B1" | "B2";
export type Frequency = "DAILY" | "THREE_PER_WEEK" | "OWN_PACE";

/* Shared option sets — single source of truth for the onboarding flow, the
   Profile "My setup" editors, and the server-side write validation. */
export const LEVELS: DutchLevel[] = ["A0", "A1", "A2", "B1", "B2"];
export const FREQUENCIES: Frequency[] = ["DAILY", "THREE_PER_WEEK", "OWN_PACE"];
/* Reminder slots.

   The stored value is the **UTC hour the cron fires at**, not a time anyone is
   shown. That is forced by the sender: `sendDueReminders` selects users whose
   `reminderTime` starts with the current UTC hour (lib/push-sender.ts), so the
   slot value and the cron schedule in vercel.json are the same number by
   construction — change one and you must change the other, or the query
   matches nobody and reminders stop silently.

   These three land at 08:00 / 12:00 / 18:00 in the Netherlands in summer, and
   an hour earlier in winter. That hour of drift is why the UI names slots in
   words (morning / midday / evening) rather than claiming a clock time: with
   crons pinned to UTC and one plan-capped run per slot per day, a precise
   local time is not something the app can honestly promise. Serving arbitrary
   timezones at a chosen local hour needs an hourly cron — a hosting decision,
   not a code one. See docs/audit-2026-08-13.md (F7). */
export const REMINDER_SLOTS = ["06:00", "10:00", "16:00"] as const;

export type ReminderSlot = (typeof REMINDER_SLOTS)[number];

/** Time-of-day key each slot is presented as. Drives the message catalog. */
export const REMINDER_SLOT_KEYS: Record<ReminderSlot, string> = {
  "06:00": "morning",
  "10:00": "midday",
  "16:00": "evening",
};

export const MAX_CONTEXTS = 4;

export type OnboardingState = {
  /** Current screen, 0–6. */
  step: number;
  /** Interface language picked on Screen 0. */
  locale: Locale | null;
  firstName: string;
  level: DutchLevel | null;
  /** Life-context slugs (1–4) selected on Screen 4. */
  contexts: string[];
  frequency: Frequency | null;
  /** Canonical 24h "HH:mm" slot, or null (off / own pace). */
  reminderTime: string | null;
};

/** Payload persisted by the completeOnboarding server action. */
export type OnboardingPayload = {
  firstName: string;
  locale: Locale;
  level: DutchLevel;
  contexts: string[];
  frequency: Frequency;
  reminderTime: string | null;
};

export function isOnboardingComplete(s: OnboardingState): boolean {
  return (
    s.firstName.trim().length > 0 &&
    s.level !== null &&
    s.frequency !== null &&
    s.contexts.length >= 1 &&
    s.contexts.length <= 4
  );
}

/** Build the server payload, or null when answers are incomplete. */
export function toOnboardingPayload(s: OnboardingState): OnboardingPayload | null {
  if (!isOnboardingComplete(s) || !s.level || !s.frequency) return null;
  return {
    firstName: s.firstName.trim(),
    locale: s.locale ?? "en",
    level: s.level,
    contexts: s.contexts,
    frequency: s.frequency,
    reminderTime: s.reminderTime,
  };
}

export const ONBOARDING_STORAGE_KEY = "stap.onboarding";

export const initialOnboardingState: OnboardingState = {
  step: 0,
  locale: null,
  firstName: "",
  level: null,
  contexts: [],
  frequency: null,
  reminderTime: null,
};

/** Counted steps (screens 2–6 render 1/5 … 5/5); screens 0–1 are pre-flow. */
export const ONBOARDING_TOTAL_STEPS = 5;
export const ONBOARDING_LAST_STEP = 6;
