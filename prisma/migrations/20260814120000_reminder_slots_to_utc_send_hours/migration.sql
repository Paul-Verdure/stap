-- Reminder slots become the UTC hour the cron actually fires at.
--
-- `sendDueReminders` selects users whose reminder_time starts with the current
-- UTC hour, so the stored value and the cron schedule in vercel.json are the
-- same number by construction. The crons moved from 08:00/12:00/18:00 UTC to
-- 06:00/10:00/16:00 UTC, so that a send lands in the Dutch morning, midday and
-- evening rather than two hours later. Existing rows must move with them --
-- otherwise every firing matches nobody and reminders stop silently.
--
-- Data-only: the column stays TEXT and nullable, and NULL (reminders off, or
-- OWN_PACE) is deliberately untouched. The three source values are disjoint
-- from the three targets, so the order of these statements does not matter and
-- re-running is a no-op.

UPDATE "users" SET "reminder_time" = '06:00' WHERE "reminder_time" = '08:00';
UPDATE "users" SET "reminder_time" = '10:00' WHERE "reminder_time" = '12:00';
UPDATE "users" SET "reminder_time" = '16:00' WHERE "reminder_time" = '18:00';
