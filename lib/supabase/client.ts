import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — use this in Client Components only.
// A new instance per call is fine: createBrowserClient is a thin singleton
// internally and reads the public env vars (safe to expose).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
