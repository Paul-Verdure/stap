# Phrase audio source files

One `<slug>.mp3` per phrase, where the slug matches the `slug` field of a
phrase in `../phrases/{a0,a1,a2,b1,b2}.json`. Examples:

- `hallo.mp3`
- `dank-je-wel.mp3`
- `goedemorgen.mp3`

These files **are committed to git**: the audio catalog is part of the
reproducible demo. Keep them tight (kB, not MB) so the repo stays light.

## Generating

Clips are synthesized from `textNl` with Google Cloud Text-to-Speech, one
voice for the whole catalog. See
`../../../docs/decisions/0004-catalog-audio-source.md` for why that engine
and why the voice does not vary with the je/u register.

Requires `ffmpeg` on PATH and `GOOGLE_TTS_API_KEY` in `.env` (an API key
restricted to the Cloud Text-to-Speech API — a build-time credential, never
needed by the app at runtime).

```bash
pnpm audio:generate --list-voices   # see what nl-NL offers
pnpm audio:generate --limit 5       # sample a few before committing to a voice
pnpm audio:generate                 # fill in whatever is missing
pnpm audio:generate --force         # regenerate everything (e.g. voice change)
```

Generation only writes local files. It is a separate step from upload so the
clips can be reviewed in a pull request before they reach the bucket.

Output is 64 kbps mono MP3 at 24 kHz with the silence trimmed off both ends —
typically 12–24 KB per clip. The script reports anything above 50 KB.

## Uploading

```bash
pnpm db:sync-audio
```

The script uploads each file to the Supabase Storage bucket `phrase-audio`
(with `upsert: true` — re-runs overwrite) and sets the matching row's
`audio_url` to the storage path (e.g. `hallo.mp3`).

Behavior:

- Files whose slug does not match an existing phrase are **skipped** with a
  warning.
- Phrases with no matching audio file keep `audio_url = null`.
- The script never NULLs an `audio_url`: deleting audio is an explicit
  operation, not a side effect of removing the local file.

## Coverage

`pnpm content:check` reports audio coverage per level from the files in this
directory. Under `--strict` it enforces a ratchet rather than a percentage
floor: a level must be **either fully voiced or not voiced at all**. A level
left half-generated fails the lint, because a button that plays or sits dead
depending on the day reads as broken rather than unfinished.
