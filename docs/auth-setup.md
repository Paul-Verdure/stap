# Auth setup — Supabase dashboard runbook (Phase C)

The app code for the magic-link flow is in place. These steps are the
**dashboard-side** configuration that only a project admin can do. Do them
once per Supabase environment (dev project, later the prod project).

Flow recap: passwordless magic link. `signInWithOtp` emails a `token_hash`;
the link points at `/auth/confirm`, which calls `verifyOtp` and establishes
the session. There is no password anywhere.

## 1. Email provider

**Authentication → Sign In / Providers → Email**

- Enable the **Email** provider.
- Enable **Email OTP** (this is what powers the magic link).
- "Confirm email" / double opt-in is irrelevant to the OTP flow and can stay
  at its default.
- OTP expiry: `3600` (1 hour) is a reasonable default.

## 2. URL configuration

**Authentication → URL Configuration**

- **Site URL** (dev): `http://localhost:3000`
- **Redirect URLs** (allow-list) — add:
  - `http://localhost:3000/**`
  - later, the Vercel domain: `https://<your-app>.vercel.app/**`

The allow-list must cover `…/auth/confirm`. `emailRedirectTo` is built by the
app as `<origin>/auth/confirm?next=/<locale>`; Supabase rejects any redirect
not matching the allow-list, so the `/**` wildcard is required.

## 3. Magic-link email template

**Authentication → Emails → Templates → Magic Link**

Replace the default body with the bilingual template below. The critical part
is the link target:

```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email
```

`{{ .RedirectTo }}` resolves to the app's `emailRedirectTo`
(`…/auth/confirm?next=/<locale>`), so appending `&token_hash=…&type=email`
yields the final URL the `/auth/confirm` route expects. Do **not** use the
default `{{ .ConfirmationURL }}` — that targets Supabase's own verify endpoint
and bypasses the SSR token_hash flow.

Subject line: `Your Stap sign-in link · Votre lien de connexion Stap`

```html
<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
  <p style="font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #e8a020; margin: 0 0 16px;">Stap</p>

  <h1 style="font-size: 22px; margin: 0 0 8px;">Your magic link is ready</h1>
  <p style="font-size: 15px; line-height: 1.6; color: #5a5650; margin: 0 0 20px;">
    Tap the button below to sign in. No password, nothing to remember — just
    one step.
  </p>

  <p style="margin: 0 0 28px;">
    <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email"
       style="display: inline-block; background: #e8a020; color: #1a1a1a; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 20px; border: 1.5px solid #1a1a1a; border-radius: 12px;">
      Sign in to Stap
    </a>
  </p>

  <hr style="border: none; border-top: 1px solid #e8e4dc; margin: 28px 0;" />

  <h1 style="font-size: 22px; margin: 0 0 8px;">Votre lien magique est prêt</h1>
  <p style="font-size: 15px; line-height: 1.6; color: #5a5650; margin: 0 0 20px;">
    Cliquez sur le bouton ci-dessous pour vous connecter. Aucun mot de passe,
    rien à retenir — juste un pas.
  </p>

  <p style="margin: 0 0 28px;">
    <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email"
       style="display: inline-block; background: #e8a020; color: #1a1a1a; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 20px; border: 1.5px solid #1a1a1a; border-radius: 12px;">
      Se connecter à Stap
    </a>
  </p>

  <p style="font-size: 12px; color: #5a5650; margin: 24px 0 0;">
    If you didn't request this, you can safely ignore this email. ·
    Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
  </p>
</div>
```

> The email is intentionally a single bilingual template: Supabase has no UI
> locale at send time, and one template avoids any detection logic (decision
> recorded in the Phase C session).

## 4. End-to-end check (after the above)

1. `pnpm dev`, open `http://localhost:3000` → redirected to `/<locale>/login`
   (protected-by-default).
2. Enter your email, submit → "Check your inbox" state.
3. Open the email, click the button → lands authenticated on `/<locale>`,
   showing your email + a sign-out button.
4. Sign out → back to `/<locale>/login`.

If the link errors, check: redirect allow-list covers `/auth/confirm`, the
template uses `token_hash` (not `ConfirmationURL`), and the OTP has not
expired.

## 5. Asymmetric JWT signing keys (performance, optional but recommended)

> **✅ Done 2026-07-15.** The project was rotated to an ECC (ES256) signing
> key: the JWKS endpoint publishes an EC P-256 key and fresh access tokens
> carry `alg: ES256`. `getClaims()` now verifies locally. The steps below are
> kept as the runbook for a future environment (e.g. a separate prod project).

The app's auth checks (`getCurrentUser` in `lib/auth/user.ts`, the session
gate in `lib/supabase/middleware.ts`) use `supabase.auth.getClaims()`. On a
project still using the legacy **symmetric** JWT secret (HS256 — the default),
`getClaims()` transparently falls back to a network call to the auth server on
every request, identical to the old `getUser()` behavior — so the app works
correctly either way, with no code changes needed.

Switching the project to an **asymmetric** signing key (ECC, recommended)
lets `getClaims()` verify the JWT signature locally via WebCrypto instead,
with the public key (JWKS) cached for 10 minutes. Since the auth check runs on
**every** matched request in the proxy — including link prefetches — this
removes what was the single largest source of navigation latency in the app.

**This is a dashboard-only change and must be done by a project admin — not
something the app's code can do.**

1. **Authentication → JWT Keys** (or **Sign In / Providers → JWT Settings**,
   depending on the dashboard version) in the Supabase project.
2. Rotate the signing key to an **ECC (ES256)** asymmetric key. Supabase's
   rotation is designed to be non-disruptive: existing sessions signed with
   the old symmetric secret keep validating until they naturally expire
   (default access-token lifetime is short, so this resolves within about an
   hour), while new tokens are signed with the new key.
3. No code change or redeploy is required — `getClaims()` already prefers the
   asymmetric path automatically. Verify by checking the JWT header of a
   fresh access token (`alg` should read `ES256`, not `HS256`) — the Supabase
   dashboard's session inspector or `jwt.io` on a copied token both work.
4. **Trade-off to know before switching:** local verification only checks the
   JWT signature and expiry — it does **not** re-check the live user record
   on every request, so a ban or a forced session revocation propagates only
   once the current access token expires (not instantly, unlike `getUser()`).
   Account deletion is the case that matters here: it removes every row the
   user owns (ADR 0003), so a token minted before the delete still passes the
   middleware gate until it expires, but it resolves to an id with no rows —
   reads return nothing and writes fail on the foreign key. The window before
   an out-of-band revocation reaches the gate is therefore the whole of the
   exposure, and there is nothing left to read during it.
