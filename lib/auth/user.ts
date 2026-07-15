import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// Server-side current-user helper. Returns { id } for the authenticated user,
// or null when there is no session. Uses getClaims() rather than getSession()
// (which trusts the cookie without verifying it) — never trust the session
// cookie for authorization decisions. getClaims() cryptographically verifies
// the JWT signature (locally via WebCrypto once the Supabase project uses an
// asymmetric signing key, see docs/auth-setup.md; a getUser()-equivalent
// network call otherwise), so it is as trustworthy as getUser() while being
// far cheaper once that switch is made. Every call site only needs `.id`, so
// the return type stays minimal instead of mirroring the full Supabase User.
//
// Wrapped in React.cache(): layouts, pages, and data helpers all call this
// independently. The cache scopes to one render pass, so the token is
// verified exactly once per request instead of once per caller.
export const getCurrentUser = cache(async (): Promise<{ id: string } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data ? { id: data.claims.sub } : null;
});
