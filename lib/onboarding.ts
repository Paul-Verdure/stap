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
