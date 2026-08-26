import { describe, expect, it } from "vitest";

import {
  CATCH_UP_MINUTES,
  isCadenceDue,
  isReminderDue,
  slotMinutes,
} from "@/lib/reminders";

/* These pin down the rule that replaced "the current UTC hour equals the slot".
   The failure mode they guard against is the one that made the old scheme
   fragile: a cron firing that lands late, or not at all, silently dropping a
   whole cohort for the day. Reminder slots are LOCAL times now, so every value
   below is the user's own wall clock — the timezone arithmetic itself is
   Postgres's job (lib/push-sender.ts) and is deliberately not re-implemented
   here. */

describe("slotMinutes", () => {
  it("reads a canonical HH:mm slot", () => {
    expect(slotMinutes("00:00")).toBe(0);
    expect(slotMinutes("08:00")).toBe(480);
    expect(slotMinutes("18:30")).toBe(1110);
    expect(slotMinutes("23:59")).toBe(1439);
  });

  it("rejects anything that is not one", () => {
    for (const bad of ["", "8:00", "0800", "08:00:00", "24:00", "08:60", "ab:cd"]) {
      expect(slotMinutes(bad)).toBeNull();
    }
  });
});

describe("isCadenceDue", () => {
  const week = [1, 2, 3, 4, 5, 6, 7];

  it("DAILY is due every day", () => {
    expect(week.every((d) => isCadenceDue("DAILY", d))).toBe(true);
  });

  it("THREE_PER_WEEK is due on Monday, Wednesday and Friday only", () => {
    expect(week.filter((d) => isCadenceDue("THREE_PER_WEEK", d))).toEqual([1, 3, 5]);
  });

  it("OWN_PACE is never due — it has no rhythm to be behind on", () => {
    expect(week.some((d) => isCadenceDue("OWN_PACE", d))).toBe(false);
  });
});

describe("isReminderDue", () => {
  // Wednesday, so both DAILY and THREE_PER_WEEK are due by cadence.
  const base = { slot: "08:00", frequency: "DAILY", isoWeekday: 3 } as const;

  it("is due on the minute", () => {
    expect(isReminderDue({ ...base, localTime: "08:00" })).toBe(true);
  });

  it("is still due 59 minutes late — a Hobby cron fires inside its hour", () => {
    // The reason the window exists: Vercel schedules Hobby crons to the hour
    // (+/-59 min), so an hour-equality test would have to be lucky.
    expect(isReminderDue({ ...base, localTime: "08:59" })).toBe(true);
  });

  it("catches up a skipped firing, up to the window", () => {
    expect(isReminderDue({ ...base, localTime: "10:59" })).toBe(true); // 179 min
    expect(isReminderDue({ ...base, localTime: "11:00" })).toBe(false); // 180
    expect(CATCH_UP_MINUTES).toBe(180);
  });

  it("says nothing before the slot", () => {
    expect(isReminderDue({ ...base, localTime: "07:59" })).toBe(false);
    expect(isReminderDue({ ...base, localTime: "00:00" })).toBe(false);
  });

  it("does not chase a slot across local midnight", () => {
    // 23:00 slot, 00:30 the next local day: the elapsed time is negative, not
    // 90 minutes. The day boundary is the caller's guard (lastRemindedOn).
    expect(
      isReminderDue({ ...base, slot: "23:00", localTime: "00:30" }),
    ).toBe(false);
  });

  it("respects the cadence before the clock", () => {
    // Tuesday: THREE_PER_WEEK owes nothing, however right the hour is.
    expect(
      isReminderDue({ ...base, frequency: "THREE_PER_WEEK", isoWeekday: 2, localTime: "08:00" }),
    ).toBe(false);
    expect(
      isReminderDue({ ...base, frequency: "THREE_PER_WEEK", isoWeekday: 3, localTime: "08:00" }),
    ).toBe(true);
  });

  it("refuses a malformed slot rather than guessing", () => {
    expect(isReminderDue({ ...base, slot: "morning", localTime: "08:00" })).toBe(false);
    expect(isReminderDue({ ...base, localTime: "" })).toBe(false);
  });
});
