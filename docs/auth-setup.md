# Auth setup — Supabase dashboard runbook

The app code for the sign-in flow is in place. These steps are the
**dashboard-side** configuration that only a project admin can do. Do them
once per Supabase environment (dev project, later the prod project).

Flow recap: passwordless, no password anywhere. One `signInWithOtp` call emails
**two renderings of the same one-shot token** —

- a **numeric code**, typed into the sign-in form, which `verifySignInCode`
  (`lib/auth/actions.ts`) hands to `verifyOtp`;
- a **link** carrying a `token_hash`, which `/auth/confirm` verifies.

Whichever is used first wins; the other stops working. The code is not a
nicety: it is the only path that works in an installed iOS web app — see
[ADR 0005](decisions/0005-sign-in-code.md). Both therefore have to keep
working, which is what §3 below is about.

## 1. Email provider

**Authentication → Sign In / Providers → Email**

- Enable the **Email** provider.
- Enable **Email OTP** (this is what powers both the code and the magic link).
- "Confirm email" / double opt-in is irrelevant to the OTP flow and can stay
  at its default. Whichever way it is set, `verifyOtp` accepts the code with
  `type: "email"` — verified against this project's auth server, for a known
  address and for a brand-new one alike, so the action has no case to branch
  on.
- **Email OTP length**: currently `8` on this project. The UI never states the
  digit count and sets no `maxLength`, so any value in the allowed range
  works; `6` is friendlier to retype if you want to change it.
- OTP expiry: `3600` (1 hour) is what this project uses. Shorter (`600`) is
  the better trade now that a code — not just a link — is what expires.

## 2. URL configuration

**Authentication → URL Configuration**

- **Site URL** (dev): `http://localhost:3000`
- **Redirect URLs** (allow-list) — add:
  - `http://localhost:3000/**`
  - later, the Vercel domain: `https://<your-app>.vercel.app/**`

The allow-list must cover `…/auth/confirm`. `emailRedirectTo` is built by the
app as `<origin>/auth/confirm?next=/<locale>`; Supabase rejects any redirect
not matching the allow-list, so the `/**` wildcard is required.

## 3. Email templates

**Authentication → Emails → Templates**

Two templates carry a sign-in token, and **both need the code**: the *Magic
Link* one goes to an address that already has an account, the *Confirm signup*
one to a brand-new address. Paste the **same subject and the same body** into
both — nothing differs between them, including the link:

```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email
```

`{{ .RedirectTo }}` resolves to the app's `emailRedirectTo`
(`…/auth/confirm?next=/<locale>`), so appending `&token_hash=…&type=email`
yields the URL `/auth/confirm` expects — it passes that `type` straight to
`verifyOtp`. `type=email` is right for a confirm-signup token too (checked
against this project's auth server, both for the code and for the token_hash),
which is why the two templates can be identical. Do **not** use the default
`{{ .ConfirmationURL }}`: it targets Supabase's own verify endpoint and
bypasses the SSR token_hash flow.

`{{ .Token }}` is the numeric code. **Put it first in the subject line**, not
only in the body: iOS shows the subject in the notification banner and in the
inbox list, so the code can be read without opening the message — which is the
whole difference between a two-app round trip and a glance.

Subject line (both templates):

```
{{ .Token }} — your Stap sign-in code · votre code de connexion Stap
```

```html
<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
  <p style="font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #e8a020; margin: 0 0 16px;">Stap</p>

  <h1 style="font-size: 22px; margin: 0 0 8px;">Your sign-in code</h1>
  <p style="font-size: 15px; line-height: 1.6; color: #5a5650; margin: 0 0 16px;">
    Type it into Stap. No password, nothing to remember — just one step.
  </p>

  <p style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 30px; font-weight: 700; letter-spacing: 4px; margin: 0 0 8px; padding: 14px 20px; border: 1.5px solid #1a1a1a; border-radius: 12px; display: inline-block;">
    {{ .Token }}
  </p>
  <p style="font-size: 12px; color: #5a5650; margin: 0 0 24px;">
    This code can be used once, and expires shortly.
  </p>

  <p style="font-size: 15px; line-height: 1.6; color: #5a5650; margin: 0 0 12px;">
    On a computer, this link signs you in directly:
  </p>
  <p style="margin: 0 0 28px;">
    <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email"
       style="display: inline-block; background: #e8a020; color: #1a1a1a; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 20px; border: 1.5px solid #1a1a1a; border-radius: 12px;">
      Sign in to Stap
    </a>
  </p>

  <hr style="border: none; border-top: 1px solid #e8e4dc; margin: 28px 0;" />

  <h1 style="font-size: 22px; margin: 0 0 8px;">Votre code de connexion</h1>
  <p style="font-size: 15px; line-height: 1.6; color: #5a5650; margin: 0 0 16px;">
    Saisissez-le dans Stap. Aucun mot de passe, rien à retenir — juste un pas.
  </p>

  <p style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 30px; font-weight: 700; letter-spacing: 4px; margin: 0 0 8px; padding: 14px 20px; border: 1.5px solid #1a1a1a; border-radius: 12px; display: inline-block;">
    {{ .Token }}
  </p>
  <p style="font-size: 12px; color: #5a5650; margin: 0 0 24px;">
    Ce code est à usage unique et expire rapidement.
  </p>

  <p style="font-size: 15px; line-height: 1.6; color: #5a5650; margin: 0 0 12px;">
    Sur ordinateur, ce lien vous connecte directement :
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
2. Enter your email, submit → the code step, focus already in the field.
3. Read the code from the email **subject** (no need to open the message),
   type it, submit → lands authenticated on `/<locale>`.
4. Sign out → back to `/<locale>/login`.
5. Repeat once from the iPhone home-screen app: same two steps, no browser
   involved. That is the case the code exists for.
6. Optional, on a computer: request a code and click the link in the email
   instead — the other half of §3 should still work.

If a code is refused, check: the template actually contains `{{ .Token }}`
(both templates), the OTP has not expired, and the link in the same email was
not already used — both consume the same one-shot token.

If the link errors, check: the redirect allow-list covers `/auth/confirm`, and
the template uses `token_hash` (not `ConfirmationURL`).

> Sending is rate-limited (the built-in SMTP allows only a couple of emails
> per hour), so a burst of test sign-ins will start returning the generic
> error state. That is the limit talking, not the code.

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
