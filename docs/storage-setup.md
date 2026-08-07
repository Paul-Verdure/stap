# Storage setup — Supabase dashboard runbook (Phase F)

The app code (helpers + sync pipeline) is in place. These steps are the
**dashboard-side** setup that only a project admin can do. One-shot per
environment (dev project, later the prod project).

Phase F currently covers a single bucket — `phrase-audio` for catalog
audio. A future `avatars` bucket will follow when the profile UI lands.

## Architecture recap

```
     Google Cloud TTS                       Supabase Storage
            │                             bucket: phrase-audio
  pnpm audio:generate                     paths:  <slug>.mp3
            ▼                                     replies/<slug>.mp3
            local mp3                               ▲
prisma/seed-data/audio/<slug>.mp3   ──►─────────────┤
prisma/seed-data/audio/replies/…    ──►─────────────┤
            (committed to git)                      │ public read
                                                    │ /storage/v1/object/public/...
                pnpm db:sync-audio  ────────────────┤
                  (service role,                    │
                   upsert: true,                    │
                   sets audio_url +                 │
                   reply_audio_url)                 │
                                                    │
            Server / Client Component  ◄────────────┘
            phraseAudioUrl("hallo.mp3")
                     │
                     └─► cached offline by app/sw.ts ("stap-phrase-audio")
```

Producing the clips is a separate step from uploading them — see
`prisma/seed-data/audio/README.md` for the generation workflow and
`docs/decisions/0004-catalog-audio-source.md` for why the audio is
synthesized rather than recorded.

Bucket is **public**: catalog pronunciations have no privacy. The public
URL pattern bypasses storage auth on reads. Writes still require the
service-role key (used by `db-sync-audio.ts`), which never leaves the
server.

## 1. Create the bucket

**Storage → Create a new bucket**

- Name: `phrase-audio` (exact — the code references it as a literal)
- **Public bucket: ON**
- File size limit: leave default (50 MB is plenty for voice mp3s)
- Allowed MIME types: optional restrict — `audio/mpeg` is good hygiene

Click *Create*.

## 2. RLS policies — nothing to do

Supabase's defaults already give us what we want:

- Reads on a **public bucket** bypass the storage auth check (the
  `/object/public/<bucket>/<path>` endpoint serves files without a JWT).
- Writes require `INSERT/UPDATE/DELETE` permission on `storage.objects`,
  which `anon`/`authenticated` lack by default. The `service_role` key
  bypasses RLS — that's what `db-sync-audio.ts` uses, never the client.

Do **not** add a "public write" policy. Catalog content is server-managed.

If at some later phase you want users to upload their own avatars, add a
**second** bucket (`avatars`) with explicit RLS policies — do not relax
`phrase-audio`.

## 3. Verify

After 1-2:

1. Drop one test mp3 (any sound, ~few KB) into
   `prisma/seed-data/audio/hallo.mp3` (must match an existing phrase
   slug).
2. From the project root:

   ```bash
   pnpm db:sync-audio
   ```

   Expected output (one clip present, no replies yet):

   ```
   Audio sync complete:
     phrase  uploaded   1, audioUrl set   1
     reply   uploaded   0, replyAudioUrl set   0
     skipped (no matching slug): 0
   ```

3. Open the file's public URL — pattern:

   ```
   https://<project-ref>.supabase.co/storage/v1/object/public/phrase-audio/hallo.mp3
   ```

   The browser should play (or download) the file with no auth.

4. (Optional) Re-run `pnpm db:sync-audio` — counts stay the same, no
   errors. That confirms idempotence.

## Troubleshooting

- **`new row violates row-level security policy`** on upload: the script
  is running with the anon key instead of `SUPABASE_SERVICE_ROLE_KEY`.
  Check `.env`, and confirm the key is the one labeled *service_role* in
  the dashboard (Authentication → API).
- **Public URL returns 404**: bucket name typo, or the bucket is not
  flagged public. Double-check the *Public bucket* toggle.
- **Public URL returns 403**: the object exists but the bucket is private.
  Make it public (catalog audio is meant to be public).
