# 0005 — Sign-in is a code typed into the app; the link stays as a shortcut

- Status: Accepted
- Date: 2026-08-26
- Deciders: Project owner
- Supersedes: —
- Superseded by: —

## Context

The app installed on an iPhone home screen could not be signed into at all.
Two iOS facts stack, and either one alone would be survivable:

1. **iOS never opens a link in an installed web app.** Tapping the magic link
   in Mail opens the default browser, always. There is no Safari equivalent of
   Android's link capturing (`handle_links` / WebAPK intent filters), so no
   `manifest.ts` change affects this; only a real native app with an
   `apple-app-site-association` file captures links.
2. **A home-screen web app has its own WebKit storage container**, separate
   from Safari's. So the link *works* — `/auth/confirm` verifies the token and
   writes the session cookies — but into Safari's jar. The installed app stays
   anonymous, and no API copies a cookie between containers.

What made it a dead end rather than an annoyance: the only credential
transport was a URL, and standalone mode has no address bar to paste one into.
The user could see the email, and had no way to bring it into the app.

Three alternatives were weighed:

- **OAuth (Google / Apple)** — the only option that removes the email round
  trip entirely, one tap. But if the provider redirect returns into Safari
  rather than the standalone container, the session lands in the wrong jar:
  the same bug, reached by a longer road. iOS's behaviour on out-of-scope
  navigation from a standalone app has changed more than once and was not
  verified here; Apple additionally requires a paid developer account for the
  Service ID.
- **Passkeys** — objectively the best UX available today (Face ID, nothing to
  read or retype) and WebAuthn does work in installed web apps. Supabase has
  no first-class support, so it means a server-side WebAuthn implementation
  and custom token minting; and registering the first passkey still needs some
  other factor. It is a layer on top, not a replacement.
- **Password** — solves the transport problem, abandons the passwordless
  design the product is built on, and its reset flow is an email link again,
  which walks straight back into the same trap.

## Decision

**Email a numeric code and verify it inside the app.** `signInWithOtp` already
mints one token rendered two ways — `{{ .Token }}` (the code) and
`{{ .TokenHash }}` (the link). Both ship in the same email; whichever is used
first wins, and the other stops working.

The code step is shown to **everyone**. No user-agent sniffing, no
`display-mode` detection: the link still works for anyone who prefers it, so a
desktop user loses nothing, and one code path is one path to keep accessible
and to keep tested.

Four details are what make it pleasant rather than merely correct:

- The code goes **first in the subject line**, so iOS renders it in the
  notification banner and the inbox list — readable without opening the
  message. That is the difference between a glance and a two-app round trip.
- The input sets no `maxLength` and no placeholder — the code's length is a
  dashboard setting (8 digits today) — and the action strips non-digits, so
  pasting the whole subject line works as well as typing the digits.
- A single `verifyOtp` with `type: "email"` covers both a known address and a
  brand-new one. That was verified against the project's auth server for the
  code and for the token_hash, not assumed, which is why no branching on
  "did this account already exist" survives in the action.
- Focus moves to the code field when the step appears, and the "we sent a code
  to <address>" line is the field's own description — so the step change
  announces itself to a screen reader instead of relying on a live region the
  user may have moved past.

## Consequences

- Signing in on the installed iOS app costs one app switch, **once per
  device**: Supabase's session lives in server-set cookies, and installed web
  apps are exempt from ITP's storage eviction, so the session persists. The
  friction is a one-time cost, which is what makes it acceptable at all.
- Both email templates (*Magic Link* and *Confirm signup*) must carry
  `{{ .Token }}`. A template edited without it silently removes the only iOS
  path while leaving desktop sign-in working — the failure would look like an
  iPhone bug. §3 of `docs/auth-setup.md` is the guard against that.
- The link remains live and still opens in Safari on iOS. Someone who taps it
  there signs into Safari, not the app, and consumes the code. The copy steers
  to the code first; the link is described as the computer route.
- OAuth and passkeys stay open, and both would sit **on top** of this rather
  than replace it — the code is the bootstrap either of them would need.
