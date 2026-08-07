# Phrase audio source files

Two families, both named after the phrase's `slug` in
`../phrases/{a0,a1,a2,b1,b2}.json`:

```
<slug>.mp3          the phrase itself            226 clips
replies/<slug>.mp3  what the other person says   218 clips
```

A reply has no slug of its own — it is a field on the phrase — so the owning
phrase is what makes its clip addressable. Examples: `hallo.mp3`,
`goedemorgen.mp3`, `replies/dank-je-wel.mp3`.

These files **are committed to git**: the audio catalog is part of the
reproducible demo. Keep them tight (kB, not MB) so the repo stays light.

## Generating

Clips are synthesized from `textNl` and `replyNl` with Google Cloud
Text-to-Speech, one voice for the whole catalog. See
`../../../docs/decisions/0004-catalog-audio-source.md` for why that engine
and why the voice does not vary with the je/u register.

Requires `ffmpeg` on PATH and `GOOGLE_TTS_API_KEY` in `.env` (an API key
restricted to the Cloud Text-to-Speech API — a build-time credential, never
needed by the app at runtime).

```bash
pnpm audio:generate --list-voices   # see what nl-NL offers
pnpm audio:generate --limit 5       # sample a few before committing to a voice
pnpm audio:generate                 # fill in whatever is missing
pnpm audio:generate --only-replies  # one family only
pnpm audio:generate --force         # regenerate everything (e.g. voice change)
```

A full run is ~444 requests and **will hit the per-minute quota** on a normal
Google project. That is expected: the script backs off up to ~30s and retries,
and any clip that still fails is deleted so a plain re-run picks it up. Re-run
until it reports zero failures.

Generation only writes local files. It is a separate step from upload so the
clips can be reviewed in a pull request before they reach the bucket.

Output is 64 kbps mono MP3 at 24 kHz with the silence trimmed off both ends —
typically 12–24 KB per clip, ~7 MB for the full catalog. The script reports
anything above 50 KB.

## Uploading

```bash
pnpm db:sync-audio
```

The script uploads both families to the Supabase Storage bucket
`phrase-audio` (with `upsert: true` — re-runs overwrite) and points the
matching column at the storage path:

| local | bucket | column |
| --- | --- | --- |
| `<slug>.mp3` | `<slug>.mp3` | `phrases.audio_url` |
| `replies/<slug>.mp3` | `replies/<slug>.mp3` | `phrases.reply_audio_url` |

Behavior:

- Files whose slug does not match an existing phrase are **skipped** with a
  warning.
- Phrases with no matching file keep a `null` column.
- The script never NULLs a column: deleting audio is an explicit operation,
  not a side effect of removing the local file.

## Coverage

`pnpm content:check` reports audio coverage per level from the files in this
directory. Under `--strict` it enforces a ratchet rather than a percentage
floor: each set must be **either fully voiced or not voiced at all**. A set
left half-generated fails the lint, because a button that plays or sits dead
depending on the day reads as broken rather than unfinished.

Phrases and replies are ratcheted separately, and the reply denominator is
only the phrases that carry a reply.
