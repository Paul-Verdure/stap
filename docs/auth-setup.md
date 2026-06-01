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
