import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// Server-side current-user helper. Returns the authenticated Supabase user,
// or null when there is no session. Always uses getUser() (which revalidates
// the token with the auth server) rather than getSession() (which trusts the
// cookie) — never trust the session cookie for authorization decisions.
//
// Wrapped in React.cache(): getUser() is a network round-trip to the auth
// server, and layouts, pages, and data helpers all call this independently.
// The cache scopes to one render pass, so the token is revalidated exactly
// once per request instead of once per caller.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
