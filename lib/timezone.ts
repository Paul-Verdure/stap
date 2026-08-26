/* ===========================================================================
   Timezone helpers — reminders are sent in the user's own local time.
   ---------------------------------------------------------------------------
   The stored value is an IANA name ("Europe/Amsterdam"), read from the browser
   and validated on the server. It must be a name and not a UTC offset: an
   offset is wrong for half the year, which is the whole reason the reminder
   slots were once forced to be UTC hours.

   Validation is not cosmetic. `sendDueReminders` computes each user's local
   time with `AT TIME ZONE u.timezone`, and Postgres raises on an unknown zone
   — one junk row would take down that single query, and with it everyone
   else's reminders. Nothing reaches the column without passing through here.
=========================================================================== */

/** Every user starts here: Stap's audience learns Dutch, in the Netherlands. */
export const DEFAULT_TIMEZONE = "Europe/Amsterdam";

/** True when this runtime recognizes `tz` as an IANA zone name. */
export function isValidTimezone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    // Intl throws RangeError on an unknown zone; a valid offset string like
    // "+02:00" is accepted by Intl but rejected here, since it cannot follow
    // DST. Requiring a "/" is enough to keep those out (bar UTC itself).
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz === "UTC" || tz.includes("/");
  } catch {
    return false;
  }
}

/**
 * The browser's own zone, or null when it cannot be read (no Intl, or a
 * server render). Client-side only — the server never guesses a timezone from
 * a request, it reads what was stored.
 */
export function browserTimezone(): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && isValidTimezone(tz) ? tz : null;
  } catch {
    return null;
  }
}
