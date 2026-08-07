# 0004 — Catalog audio is synthesized with Google Cloud TTS, one voice throughout

- Status: Accepted
- Date: 2026-08-07
- Deciders: Project owner
- Supersedes: —
- Superseded by: —

## Context

The whole read path for phrase audio shipped across phases F–G and has never
had a byte of audio to serve. `phrases.audio_url` was NULL for all 226
phrases, `prisma/seed-data/audio/` held only a README, and the
`phrase-audio` bucket held zero objects. Everything downstream was already
waiting: `db-sync-audio.ts` uploads and sets the path, `phraseAudioUrl()`
builds the public URL, `AudioButton` renders disabled and dimmed on a null
path, and `ListenGame` carries an honest degraded state.

So the question was never "how do we sync the clips" — it was "where do 226
clips come from". The roadmap calls audio *what makes Stap the primary
pronunciation tool*, which sets the bar: an unnatural or subtly wrong voice
damages the product more than the absent audio it replaces.

Four sources were considered, against four constraints — Dutch pronunciation
fidelity, a licence that survives committing the output to a public
repository, reproducibility when the catalog changes, and cost.

## Decision

**Google Cloud Text-to-Speech, a single `nl-NL` voice for the entire catalog,
synthesized from `textNl` by a committed script.**

### Why Google over ElevenLabs

ElevenLabs is the most natural-sounding engine in the abstract, and it was
rejected anyway on the constraint that matters most here. Its multilingual
voices are not natively Dutch: they carry a residual accent inherited from the
voice's source language. For general narration that is a rounding error; for
the reference pronunciation a learner is asked to imitate, it is the one
defect the product cannot absorb. Google's `nl-NL` voices are trained on
Dutch natively, as are Azure's.

Licensing breaks the same way. These files are committed to a public
repository, which is redistribution. Google grants unambiguous ownership of
synthesis output; ElevenLabs' grant is tier-dependent and markedly less
comfortable about redistributing generated audio as a corpus.

Azure was an acceptable equal on both counts and lost only on the owner
having no existing subscription.

### Why not recorded native speech

It is the genuine quality ceiling and it was rejected on cost of *change*, not
cost of production. A voice session plus 226 edits plus a redistribution
rights agreement is weeks and several hundred euros — but the disqualifying
property is that it is not reproducible. Every catalog edit, every new phrase,
every re-levelled slug means re-booking a human. Phase H alone rewrote the
catalog wholesale. TTS makes regeneration `pnpm audio:generate --force`.

Revisit this if Stap stops being a portfolio project.

### Why one voice, and why register is not voiced

One voice for all 226 phrases, at natural rate, with no variation by the
je/u register the catalog carries (NEUTRAL 125, INFORMAL 74, FORMAL 27).

Voicing the register with a second speaker was rejected because it teaches
something false. Register in Dutch is lexical and grammatical — it lives in
the words, and the phrase's situation text and tips already teach it. The same
speaker uses `je` and `u` depending on who they are addressing; making formality
a property of *who is talking* misrepresents the thing being taught. A single
voice also holds the phoneme model steady across the catalog, which is the
point of a pronunciation reference.

A reduced rate for A0/A1 was rejected for the same reason: the clip is the
model of how the phrase actually sounds.

### Pipeline

Generation and upload are two commands on purpose:

```
pnpm audio:generate   →  prisma/seed-data/audio/<slug>.mp3  (committed, reviewed)
pnpm db:sync-audio    →  bucket + phrases.audio_url
```

The clips are reviewed in a pull request before they reach the bucket.

`generate-audio.ts` calls the REST endpoint with a plain API key rather than
using `@google-cloud/text-to-speech`, which would pull google-gax and a gRPC
stack in for a single POST in a devDependency-only build step. Google returns
LINEAR16 at 24 kHz; ffmpeg encodes to 64 kbps mono MP3 and trims the silence
Google pads onto each end — left in, every tap of a listen button feels laggy.

`GOOGLE_TTS_API_KEY` is a build-time credential. The app never needs it at
runtime and it never reaches the client.

## Consequences

### Positive

- **The whole read path lights up at once.** Nothing downstream had to change:
  the moment `audio_url` is non-null, the pronunciation buttons play and the
  Listen game leaves its degraded branch.
- **Regeneration is cheap and total.** A voice change is one `--force` run,
  about $0.24 and a minute. This is what makes the choice reversible.
- **The licence is clean for a public repo**, which was the constraint that
  eliminated the best-sounding option.
- **Cost is not a factor**: 226 phrases is roughly 8,000 characters.

### Negative / accepted trade-offs

- **Synthetic, not human.** A native speaker would be better, and a careful
  listener can tell. Accepted for reproducibility; the note above records when
  to revisit.
- **A generation credential is now part of the content workflow.** Contributors
  editing phrases need a Google API key to produce the matching clip — a new
  barrier where previously the catalog was pure JSON. Mitigated by the clips
  being committed: only the person adding a phrase needs the key.
- **Regional accent is a choice we are making implicitly.** The `nl-NL` voices
  are Netherlands Dutch; a Flemish learner gets a slightly foreign model. Out
  of scope, and `nl-BE` voices exist if that ever matters.
- **ffmpeg is now a contributor prerequisite** for generation, though not for
  running the app.

### Rejected alternatives

- **ElevenLabs** — best naturalness, non-native Dutch pronunciation,
  tier-dependent redistribution grant.
- **Azure Neural TTS** — technically equivalent to the decision; lost on the
  owner having no existing subscription. The nearest fallback if Google
  becomes inconvenient.
- **Recorded native speech** — the quality ceiling, but slow, costly and above
  all not reproducible.
- **macOS `say`** — free and instantly available, but the `Xander` voice is
  pre-neural and well below the bar. Used only to dry-run the pipeline; never
  committed.

## Scope

This ADR governs how catalog phrase audio is produced and encoded. It does not
govern the storage and read path (see `docs/storage-setup.md`), the offline
caching rule in `app/sw.ts`, or any future user-recorded audio.
