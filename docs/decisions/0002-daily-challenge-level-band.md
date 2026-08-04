# 0002 — Level band for daily-challenge selection

- Status: Accepted
- Date: 2026-08-04
- Deciders: Project owner
- Supersedes: —
- Superseded by: —

## Context

`selectPhraseForDay` (`lib/challenge.ts`) picks one catalog phrase per user per
day. From phase G4 until phase H the eligibility rule was **"at or below the
user's level"**: an `A2` learner drew from `A0 ∪ A1 ∪ A2`, a `B2` learner from
the entire catalog.

That rule was written when the catalog held 25 phrases, 17 of them `A0`. At
that volume the distinction hardly mattered — there was nothing else to serve.
Phase H changed the volume, and the rule's failure mode became measurable.

Walking the real selection function across 5 levels × 8 life contexts ×
30 days, the share of picks landing at the user's **own** level was:

| catalog state | A0 | A1 | A2 | B1 | B2 |
| --- | --- | --- | --- | --- | --- |
| 73 phrases (A2 filled) | 100% | — | 43% | 25% | 21% |
| 226 phrases (all filled) | 100% | 44% | 30% | 24% | **13%** |

The second row is the important one. **Enriching the beginner levels made the
advanced levels worse.** Because every level below is eligible, each phrase
added at `A0` enlarges the pool that a `B2` learner draws from and dilutes what
they receive. A learner who declared "I'm fairly comfortable already" was being
served 87% content below their level, and the more content we wrote, the worse
that number got. The catalog was working against itself.

Two further consequences followed from the same rule:

- `getRelatedPhrases` filtered on shared theme only, with no level constraint.
  It feeds the preparation key words *and* the distractor pool for all three
  games, so a `B2` challenge offered `Sorry` and `Dank je wel` as wrong
  answers — every round trivially guessable.
- Nothing prevented the same theme two days running, which reads as a catalog
  that has run out even when it has not.

## Decision

Serve each user a **sliding two-level band**: their own level plus the one
below. `bandLevels("B1")` is `["A2", "B1"]`; `bandLevels("A0")` is `["A0"]`.

The band, the repeat window and the pool floor live together in
`lib/challenge-config.ts`, imported by both the runtime and the catalog lint.

### Selection chain

After the band and life-context filter, the pool is narrowed twice, in order:

1. phrases used within `REPEAT_WINDOW_DAYS`;
2. phrases sharing yesterday's theme.

Both go through a shared `narrow()` helper that **keeps the wider pool when a
narrowing would empty it**. Every filter is a preference, never a constraint —
the user must receive a challenge today even when the catalog cannot satisfy
everything at once.

### The pool floor is derived, not chosen

```
MIN_BAND_CONTEXT_POOL = REPEAT_WINDOW_DAYS + MIN_REMAINING_CHOICES
```

A user may select a single life context, so the worst case a real user can hit
is one band crossed with one context. If that pool does not exceed the repeat
window, the window empties it, the fallback allows a repeat, and the anti-repeat
guarantee silently stops holding. `pnpm content:check --strict` enforces the
floor per (level, context) pair and fails the build below it.

`REPEAT_WINDOW_DAYS` stays at **14**. Raising it was considered and rejected:
the binding pool is `A0`'s 21 (its band is itself alone), so a 30-day window
would empty it and reopen the exact repeat bug the phase-H `A0` top-up closed.
Because the floor is derived, raising the window later automatically raises the
content bar rather than invalidating it.

### Neighbours are banded too

`getRelatedPhrases` now filters on `bandLevels(phrase.level)` — the band of the
phrase itself, not of the user, so the function keeps its single-argument
signature and every call site is unchanged.

## Consequences

### Positive

- **The catalog stops fighting itself.** Adding `A0` content now reaches `A0`
  and `A1` profiles only. Measured after the change: 100% of picks in band at
  every level, ~50% at the exact level (the remainder is deliberate
  consolidation from the level below), 0 in-window repeats, 0 back-to-back
  themes.
- **Games and key words become level-appropriate.** All 226 phrases still find
  five in-band neighbours, so no mechanic degrades.
- **The content bar is machine-checked.** The lint imports the runtime's own
  constants, so the two cannot drift.

### Negative / accepted trade-offs

- **Lower levels become unreachable for advanced users.** A `B2` learner will
  never be served `Hallo` again. Accepted deliberately: revision belongs to the
  vocabulary/spaced-exposure surface (`VocabularyCard`), not to the one daily
  challenge.
- **Content debt is now per band, not global.** A thin level degrades both its
  own band and the one above, which is why `content:check` measures per (level,
  context) rather than in total.
- **Two extra queries per selection** — the phrase themes for rotation, and
  yesterday's themes. Both are small and indexed, on a path that runs once a
  day per user.
- **A0 is a band of one.** It has no level below to draw from, so it is
  structurally the tightest pool and the first to break if content is removed.

### Rejected alternatives

- **Keep "at or below".** Rejected: it is the defect, and it worsens as the
  catalog grows.
- **Weighted selection (~80% current level, 20% revision across all lower
  levels).** Keeps every level eligible with a strong bias. Rejected as
  strictly more complex — it needs weighting inside a deterministic hash pick,
  and it leaves the dilution in place rather than removing it, so the same
  measurement problem returns at larger catalog sizes.
- **Exact level only (no band).** Simplest, but it removes consolidation
  entirely and makes each level's pool stand alone, which would put every level
  in `A0`'s tight position.

## Scope

This ADR governs daily-challenge selection and the neighbour lookup that feeds
preparation and the games. It does not govern the onboarding level question,
the vocabulary/spaced-exposure model, or the rhythm derivation — all unchanged.
