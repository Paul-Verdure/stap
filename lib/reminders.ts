import type { Frequency } from "@/lib/onboarding";

/* ===========================================================================
   When is a reminder due? — the pure half of the daily-reminder sender.
   ---------------------------------------------------------------------------
   Postgres converts `now()` into each user's timezone (that is its job, DST
   included); these functions decide, from that local wall clock, whether a
   reminder is owed. Keeping the rules here rather than in the SQL is what
   makes them testable without a database — see tests/reminders.test.ts.

   The predicate is "the slot has passed today and no reminder has gone out in
   this local day", NOT "the current hour equals the slot". That difference is
   the point: Vercel's Hobby plan schedules cron jobs only to the hour
   (+/-59 min) and can skip a firing outright, so an hour-equality test loses
   the whole cohort for the day, silently. A window instead lets the next
   hourly run catch up — bounded, because a nudge hours late is noise rather
   than a nudge.
=========================================================================== */

/** How long after its slot a reminder may still go out. */
export const CATCH_UP_MINUTES = 180;

/** ISO weekdays a THREE_PER_WEEK user is reminded on: Mon / Wed / Fri. */
const THREE_PER_WEEK_DAYS = [1, 3, 5];

/** Minutes since local midnight for an "HH:mm" slot, or null if malformed. */
export function slotMinutes(slot: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(slot);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Does this cadence owe a reminder on this ISO weekday (1 = Monday)?
 * OWN_PACE never does — it has no rhythm to be behind on.
 */
export function isCadenceDue(frequency: Frequency, isoWeekday: number): boolean {
  if (frequency === "DAILY") return true;
  if (frequency === "THREE_PER_WEEK")
    return THREE_PER_WEEK_DAYS.includes(isoWeekday);
  return false;
}

/**
 * Is a reminder owed right now, given the user's own local clock? `localTime`
 * and `slot` are both local "HH:mm"; `isoWeekday` is the local weekday.
 */
export function isReminderDue({
  localTime,
  isoWeekday,
  slot,
  frequency,
}: {
  localTime: string;
  isoWeekday: number;
  slot: string;
  frequency: Frequency;
}): boolean {
  if (!isCadenceDue(frequency, isoWeekday)) return false;

  const now = slotMinutes(localTime);
  const due = slotMinutes(slot);
  if (now === null || due === null) return false;

  // Same local day only: a slot still ahead is not late, and yesterday's slot
  // is not chased across midnight (the caller already excludes a local day
  // that has had its reminder).
  const elapsed = now - due;
  return elapsed >= 0 && elapsed < CATCH_UP_MINUTES;
}
