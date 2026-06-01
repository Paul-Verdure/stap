// Public URL builder for catalog phrase audio. Pure function — safe in both
// Server and Client Components. The bucket is public (catalog audio has no
// privacy), so no signing is required at the read path.

const BUCKET = "phrase-audio";

// Build the public URL for a phrase audio file from its storage path
// (e.g. "hallo.mp3"). Returns null when the phrase has no audio yet
// (audio_url is null in the DB).
//
// Pattern: <project>/storage/v1/object/public/<bucket>/<path> — stable.
// A future move to a CDN or custom domain only touches this helper, not
// every read site.
export function phraseAudioUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
