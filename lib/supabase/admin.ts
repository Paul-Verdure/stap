import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client. **SERVER-SIDE ONLY.**
//
// Uses SUPABASE_SERVICE_ROLE_KEY, which is NOT prefixed NEXT_PUBLIC_ so
// Next.js never inlines it into the client bundle. Importing this module
// from a Client Component would simply fail at runtime (env var undefined)
// — no secret leaked — but it would still fail. Never import from
// "use client" code.
//
// This client **bypasses RLS by design**: it is for admin/server tasks
// (storage uploads, seed-style scripts, cron, internal sync). Per-request
// server work that should be subject to RLS uses lib/supabase/server.ts
// (anon key + per-user JWT) instead.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
