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

   These are LOCAL wall-clock times, read in the user's own `timezone` (see
   lib/timezone.ts). The sender converts per user with `AT TIME ZONE`, so the
   value is a time the UI can name honestly in both halves of the DST year —
   which it could not while a slot was secretly the UTC hour a cron fired at.

   Nothing outside this file depends on the numbers any more: vercel.json fires
   the sender every hour and lib/reminders.ts decides who is due. A fourth slot
   would be a one-line change here plus its copy. */
export const REMINDER_SLOTS = ["08:00", "12:00", "18:00"] as const;

export type ReminderSlot = (typeof REMINDER_SLOTS)[number];

/** Time-of-day key each slot is presented as. Drives the message catalog. */
export const REMINDER_SLOT_KEYS: Record<ReminderSlot, string> = {
  "08:00": "morning",
  "12:00": "midday",
  "18:00": "evening",
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
  /** IANA zone the reminder slot is meant in — read from the browser. */
  timezone: string;
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

/**
 * Build the server payload, or null when answers are incomplete. `timezone` is
 * a parameter rather than read here: this module is imported on both sides, and
 * Intl on the server would happily answer with the server's own zone.
 */
export function toOnboardingPayload(
  s: OnboardingState,
  timezone: string,
): OnboardingPayload | null {
  if (!isOnboardingComplete(s) || !s.level || !s.frequency) return null;
  return {
    firstName: s.firstName.trim(),
    locale: s.locale ?? "en",
    level: s.level,
    contexts: s.contexts,
    frequency: s.frequency,
    reminderTime: s.reminderTime,
    timezone,
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
