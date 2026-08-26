// The one-shot sign-in code, as it arrives from a human rather than from a
// keypad. Both entry points — signing in (lib/auth/actions) and finishing
// sign-up (lib/onboarding-actions) — verify the same kind of token, so they
// read it the same way here.
//
// The code's length is a Supabase dashboard setting (8 digits today), so
// nothing validates a length. Non-digits are dropped instead, which is what
// makes ADR 0005's promise true: the code leads the email subject line, and
// pasting that whole line has to work as well as typing the digits.
export function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, "");
}
