# 0003 — Account deletion is a hard delete

- Status: Accepted
- Date: 2026-08-07
- Deciders: Project owner
- Supersedes: —
- Superseded by: —

## Context

`deleteAccount` (`lib/account-actions.ts`) shipped in phase G8 as a deliberate
stub: the confirm modal was fully built — typed confirmation word, loss list,
irreversible-action pill — but the action itself returned a `"stubbed"` marker
and deleted nothing. The UI said so honestly rather than pretending.

That stub was the last open **security stop** before deploy, and the roadmap
left the semantics undecided: soft-delete or hard-delete, to be chosen
deliberately rather than by whichever was easier to write.

Two facts settled it.

**The hard-delete path already existed.** The phase-D migration
`auth_user_sync` installs an `on_auth_user_deleted` trigger: removing a row
from `auth.users` deletes the mirror row in `public.users`, and every
user-owned relation in `schema.prisma` declares `onDelete: Cascade` from
`User` — challenges, journal entries, vocabulary cards, daily activities,
seasonal reviews, life-context links, game plays, push subscriptions. All
eight. `lib/supabase/admin.ts` (service-role client) was written in an earlier
phase and never used for this. Nothing had to be built; it had to be called.

**Soft-delete was the expensive option, not the safe one.** Authentication is
passwordless magic-link with `shouldCreateUser: true`. A tombstoned account
keeps its `auth.users` row, so the user can request a link and walk straight
back in — blocking that means a `deleted_at` check in `getCurrentUser` *and*
in the middleware, plus auditing every authenticated read, forever, with a
silent data leak as the failure mode of any read that gets missed. And
`users.email` is `UNIQUE`: retaining the row keeps the address indefinitely
while making re-registration with it impossible. For a user who asked to be
deleted, that is the worst of both outcomes.

## Decision

`deleteAccount` performs an irreversible hard delete:

1. resolve the session (`getCurrentUser`); no session → `{ status: "error" }`;
2. `admin.auth.admin.deleteUser(user.id)` via the service-role client;
3. clear the session cookies with `signOut({ scope: "local" })`;
4. `redirect` to `/{locale}/login?deleted=1`.

**Delete the auth identity, never the mirror row.** Calling
`db.user.delete()` would cascade the app data but leave the `auth.users` row
alive, and the next magic link would recreate an empty account through the
insert trigger — a delete that silently reverts. Going through the admin API
makes the trigger the single deletion path.

`scope: "local"` is deliberate: the default (`global`) calls the auth server
to revoke the session, which cannot succeed for an identity that no longer
exists. The purpose of the call is only to drop the cookies.

Success does not return a value — it redirects — so `DeleteResult` narrowed to
the failure case, and the modal renders only an error state.

## Consequences

### Positive

- **The delete is real and complete.** One call, eight cascades, no residue,
  no per-read filtering to maintain and no way to leak a "deleted" account by
  forgetting a `where` clause.
- **The G8 stub is gone from the UI.** The `stubbed` copy was replaced by an
  `error` string in both locales; the success path is a farewell notice on the
  login screen rather than a bare sign-in form.
- **The phase-D trigger stops being dead code.** It was written for exactly
  this and had never run in production.
- **The RGPD pair is complete**: `exportMyData` (take your data) and
  `deleteAccount` (erase it), both reachable from the profile.

### Negative / accepted trade-offs

- **No undo, no grace period.** Once confirmed the data is unrecoverable. The
  mitigations are entirely up-front: a typed confirmation word (`DELETE` /
  `SUPPRIMER`), an explicit loss list, and the export action sitting directly
  above it in the same profile section.
- **A leaked session cookie survives the delete until it expires.** Auth is
  verified locally against the JWT signature (PR #13), so a token minted
  before the delete still verifies for the remainder of its TTL. It resolves
  to an id with no rows: reads return nothing and writes fail on the foreign
  key, so the account cannot be resurrected or read — but the middleware will
  let such a request through. Accepted as inherent to local verification; the
  alternative is a database round trip on every request.
- **`users.deleted_at` is now never written.** `push-sender` still filters on
  it, harmlessly. It is kept as the hook a grace-period delete would need, but
  it guarantees nothing today and the schema comment says so.

### Rejected alternatives

- **Soft-delete.** Rejected for the reasons above: more code, an ongoing
  filtering obligation, a magic-link re-entry hole to plug, and it retains the
  email of someone who asked to be forgotten.
- **Two-step (tombstone now, purge on a delayed job).** The best product
  answer — instant lockout with a recovery window — and the most work: it is
  soft-delete *plus* hard-delete *plus* a purge cron. Reconsider if users
  actually ask for an undo.

## Scope

This ADR governs the user-initiated account deletion reachable from the
profile. It does not govern data retention elsewhere (there is none), account
suspension (there is none), or the `exportMyData` action, which is unchanged.
