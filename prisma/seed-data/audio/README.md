# Phrase audio source files

Drop one `<slug>.mp3` per phrase you want to wire up — the slug must match
the `slug` field in `../phrases.json`. Examples:

- `hallo.mp3`
- `dank-je-wel.mp3`
- `goedemorgen.mp3`

Then run from the project root:

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
- The script never NULLs an `audio_url` — deleting audio is an explicit
  operation, not a side effect of removing the local file.

Sourcing audio: anything works (TTS service like ElevenLabs / Google,
manual recordings, etc.). Keep files small — voice mp3 at ~64 kbps mono
is typically <50 KB per phrase.

These files **are committed to git**: the audio catalog is part of the
reproducible demo. Keep them tight (kB, not MB) so the repo stays light.
