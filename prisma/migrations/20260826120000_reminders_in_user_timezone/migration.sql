-- Reminders move to the user's own timezone.
--
-- `reminder_time` stops being the UTC hour a cron fires at and becomes a LOCAL
-- wall-clock slot, read against the new `timezone` column. `sendDueReminders`
-- converts per user with `AT TIME ZONE`, so DST is handled by Postgres and the
-- stored value is finally a time the UI can name. That removes the coupling
-- between the slot values and the cron schedule: vercel.json now fires every
-- hour (24 daily jobs, which the Hobby plan allows) and the sender decides who
-- is due.
--
-- `last_reminded_on` is the idempotence key. The sender sends when the slot has
-- passed in the user's local day and no reminder was sent that local date, so a
-- firing that Vercel skips or delays (Hobby schedules to the hour, +/-59 min)
-- is caught up by the next one instead of being lost.
--
-- The data half reverses 20260814120000_reminder_slots_to_utc_send_hours: those
-- rows hold UTC send hours and must go back to the local times they were always
-- meant to be. NULL (reminders off, or OWN_PACE) is deliberately untouched. The
-- three source values are disjoint from the three targets, so the order of
-- these statements does not matter and re-running is a no-op.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_reminded_on" DATE,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Amsterdam';

UPDATE "users" SET "reminder_time" = '08:00' WHERE "reminder_time" = '06:00';
UPDATE "users" SET "reminder_time" = '12:00' WHERE "reminder_time" = '10:00';
UPDATE "users" SET "reminder_time" = '18:00' WHERE "reminder_time" = '16:00';
