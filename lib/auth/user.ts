import { createClient } from "@/lib/supabase/server";

// Server-side current-user helper. Returns the authenticated Supabase user,
// or null when there is no session. Always uses getUser() (which revalidates
// the token with the auth server) rather than getSession() (which trusts the
// cookie) — never trust the session cookie for authorization decisions.
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
