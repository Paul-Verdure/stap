import { describe, expect, it } from "vitest";

import {
  dateOnlyUTC,
  hashToInt,
  isoDate,
  lastNDatesUTC,
  startOfMonthUTC,
  startOfWeekUTC,
  subDaysUTC,
} from "@/lib/date";

/* The "day" key is UTC on purpose (documented simplification). These tests pin
   that choice down: the failure mode they guard against is a helper quietly
   picking up the host timezone, which would make the daily challenge, the
   weekly rhythm and the reminder query disagree with each other depending on
   where the server runs. */

describe("dateOnlyUTC", () => {
  it("strips the time, in UTC", () => {
    const d = dateOnlyUTC(new Date("2026-08-14T23:59:59.999Z"));
    expect(isoDate(d)).toBe("2026-08-14");
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCMilliseconds()).toBe(0);
  });

  it("keeps the UTC day either side of midnight, not the local one", () => {
    // 00:30 UTC and 23:30 UTC on the same UTC date are the same key, even
    // though they straddle midnight in most of Europe.
    expect(isoDate(dateOnlyUTC(new Date("2026-08-14T00:30:00Z")))).toBe(
      "2026-08-14",
    );
    expect(isoDate(dateOnlyUTC(new Date("2026-08-14T23:30:00Z")))).toBe(
      "2026-08-14",
    );
  });

  it("is idempotent", () => {
    const once = dateOnlyUTC(new Date("2026-08-14T12:00:00Z"));
    expect(dateOnlyUTC(once).getTime()).toBe(once.getTime());
  });
});

describe("startOfWeekUTC — Monday-start", () => {
  // 2026-08-10 is a Monday; 2026-08-16 the Sunday that closes the same week.
  it("returns the same Monday for every day of that week", () => {
    const days = [
      "2026-08-10", // Mon
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
      "2026-08-16", // Sun
    ];
    for (const day of days) {
      expect(isoDate(startOfWeekUTC(new Date(`${day}T12:00:00Z`)))).toBe(
        "2026-08-10",
      );
    }
  });

  it("treats Sunday as the end of the week, not the start", () => {
    // The off-by-one that ISO-vs-US week conventions invite: a Sunday must not
    // open a new week, or the rhythm row would shift by a day.
    const sunday = new Date("2026-08-16T12:00:00Z");
    expect(sunday.getUTCDay()).toBe(0);
    expect(isoDate(startOfWeekUTC(sunday))).toBe("2026-08-10");
    const monday = new Date("2026-08-17T12:00:00Z");
    expect(isoDate(startOfWeekUTC(monday))).toBe("2026-08-17");
  });

  it("always lands on a Monday at midnight UTC", () => {
    for (let i = 0; i < 40; i++) {
      const d = new Date(Date.UTC(2026, 0, 1 + i, 17, 45));
      const start = startOfWeekUTC(d);
      expect(start.getUTCDay()).toBe(1);
      expect(start.getUTCHours()).toBe(0);
      expect(start.getTime()).toBeLessThanOrEqual(d.getTime());
    }
  });
});

describe("lastNDatesUTC", () => {
  it("is oldest first and ends today", () => {
    const days = lastNDatesUTC(7, new Date("2026-08-14T09:00:00Z"));
    expect(days).toHaveLength(7);
    expect(isoDate(days[0])).toBe("2026-08-08");
    expect(isoDate(days[6])).toBe("2026-08-14");
  });

  it("is strictly ascending with no gaps or repeats", () => {
    const days = lastNDatesUTC(14, new Date("2026-03-02T00:00:00Z"));
    const iso = days.map(isoDate);
    expect(new Set(iso).size).toBe(14);
    for (let i = 1; i < days.length; i++) {
      expect(days[i].getTime() - days[i - 1].getTime()).toBe(86_400_000);
    }
  });

  it("crosses a month boundary correctly", () => {
    const days = lastNDatesUTC(3, new Date("2026-03-01T12:00:00Z"));
    expect(days.map(isoDate)).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);
  });
});

describe("subDaysUTC / startOfMonthUTC", () => {
  it("subtracts whole days from the date-only key", () => {
    expect(isoDate(subDaysUTC(new Date("2026-08-14T18:00:00Z"), 14))).toBe(
      "2026-07-31",
    );
  });

  it("returns the first of the month", () => {
    expect(isoDate(startOfMonthUTC(new Date("2026-08-14T18:00:00Z")))).toBe(
      "2026-08-01",
    );
    expect(isoDate(startOfMonthUTC(new Date("2026-01-31T23:00:00Z")))).toBe(
      "2026-01-01",
    );
  });
});

describe("hashToInt", () => {
  it("is deterministic and stable across processes", () => {
    // The seeded shuffles rely on this being identical on server and client,
    // so the value is pinned rather than merely compared to itself: a change
    // of hash would reshuffle every game without any test noticing.
    expect(hashToInt("stap")).toBe(hashToInt("stap"));
    expect(hashToInt("")).toBe(0x811c9dc5);
    expect(hashToInt("a")).toBe(0xe40c292c);
  });

  it("returns an unsigned 32-bit integer", () => {
    for (const s of ["", "a", "dat-is-vijf-euro", "2026-08-14:option2"]) {
      const h = hashToInt(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("separates seeds that differ only in their tail", () => {
    expect(hashToInt("seed:1")).not.toBe(hashToInt("seed:2"));
  });
});
