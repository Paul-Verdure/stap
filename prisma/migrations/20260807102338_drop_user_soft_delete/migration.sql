-- Drop the soft-delete tombstone added in G9 (add_user_soft_delete).
--
-- ADR 0003 settled account deletion as a hard delete: the auth identity is
-- removed through the Supabase admin API and every user-owned row cascades
-- away, so a deleted account leaves no row to mark. The column was never
-- written by anything, and no row ever held a value.
--
-- Keeping it would have been the more misleading option: a tombstone column
-- plus the `deleted_at IS NULL` filter in the reminder sender reads as an
-- enforced soft-delete guarantee that does not exist. Re-adding a nullable
-- column is trivial if a grace-period delete is ever built.

-- AlterTable
ALTER TABLE "users" DROP COLUMN "deleted_at";
