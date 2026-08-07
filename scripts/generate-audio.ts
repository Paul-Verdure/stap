// Catalog audio generation — `pnpm audio:generate`.
//
// Synthesizes one <slug>.mp3 per catalog phrase into prisma/seed-data/audio/,
// which `pnpm db:sync-audio` then uploads to Supabase Storage. Generation and
// upload are deliberately two steps: the clips are committed to git and
// reviewed in a pull request before they ever reach the bucket.
//
// Engine: Google Cloud Text-to-Speech, via the REST endpoint and a plain API
// key. See docs/decisions/0004-catalog-audio-source.md for why Google over
// ElevenLabs (natively Dutch voices; a redistribution licence that survives
// committing the output to a public repo) and why one voice for the whole
// catalog regardless of the je/u register the phrases carry.
//
// The REST call is deliberate rather than @google-cloud/text-to-speech: the
// SDK pulls google-gax and its gRPC stack in for what is a single POST, and
// this is a devDependency-only build step. Node 20 has global fetch.
//
// Encoding: Google returns LINEAR16 at 24 kHz, ffmpeg re-encodes to 64 kbps
// mono MP3 with the silence trimmed. Requesting MP3 from Google and then
// re-encoding would be lossy twice for no gain. Budget is <50 KB per clip
// (prisma/seed-data/audio/README.md); the script reports anything over.
//
// Usage:
//   pnpm audio:generate                 # generate what is missing
//   pnpm audio:generate --force         # regenerate everything
//   pnpm audio:generate --limit 5       # sample a handful first
//   pnpm audio:generate --list-voices   # show the available nl-NL voices
import "dotenv/config";

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { AUDIO_DIR, loadPhrases, type SourcedPhrase } from "./catalog-source";

const API_ROOT = "https://texttospeech.googleapis.com/v1";
const LANGUAGE_CODE = "nl-NL";

/** Google synthesizes at this rate; ffmpeg keeps it. Plenty for speech. */
const SAMPLE_RATE = 24_000;
/** Mono voice at 64 kbps is transparent enough and keeps the repo light. */
const BITRATE = "64k";
/** Reported, not enforced — see the audio README's size budget. */
const SIZE_BUDGET_BYTES = 50 * 1024;

/**
 * Concurrent synthesis requests. Four keeps 226 phrases to about a minute
 * without tripping the per-minute request quota on a fresh project.
 */
const CONCURRENCY = 4;

/**
 * Default voice. Overridable with GOOGLE_TTS_VOICE, and validated against the
 * live voice list at startup rather than trusted — Google's per-locale voice
 * inventory changes, and a wrong name otherwise fails 226 times in a row.
 */
const DEFAULT_VOICE = "nl-NL-Chirp3-HD-Achernar";

const args = process.argv.slice(2);
const force = args.includes("--force");
const listVoices = args.includes("--list-voices");
const limitFlag = args.indexOf("--limit");
const limit =
  limitFlag !== -1 ? Number.parseInt(args[limitFlag + 1] ?? "", 10) : NaN;

function apiKey(): string {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_TTS_API_KEY is not set.\n" +
        "Create an API key restricted to the Cloud Text-to-Speech API and add\n" +
        "it to .env. Generation is a build step — the key is never needed by\n" +
        "the app at runtime, and never ships to the client.",
    );
  }
  return key;
}

type Voice = { name: string; ssmlGender: string };

async function fetchVoices(): Promise<Voice[]> {
  const res = await fetch(
    `${API_ROOT}/voices?languageCode=${LANGUAGE_CODE}&key=${apiKey()}`,
  );
  if (!res.ok) {
    throw new Error(
      `Voice list failed: ${res.status} ${res.statusText}\n${await res.text()}`,
    );
  }
  const body = (await res.json()) as { voices?: Voice[] };
  return body.voices ?? [];
}

/**
 * One phrase to LINEAR16 WAV bytes. Retries on 429 and 5xx with a backoff:
 * a rate-limit partway through 226 phrases should slow the run down, not
 * abort it and leave the directory half-populated.
 */
async function synthesize(text: string, voice: string): Promise<Buffer> {
  const body = JSON.stringify({
    input: { text },
    voice: { languageCode: LANGUAGE_CODE, name: voice },
    audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: SAMPLE_RATE },
  });

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API_ROOT}/text:synthesize?key=${apiKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (res.ok) {
      const json = (await res.json()) as { audioContent: string };
      return Buffer.from(json.audioContent, "base64");
    }

    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt >= 4) {
      throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
    }
    await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
  }
}

/**
 * WAV in, 64 kbps mono MP3 out, silence trimmed off both ends.
 *
 * Google pads synthesis with a beat of silence at each end. Left in, every tap
 * of a listen button feels laggy, which matters on a screen the learner taps
 * repeatedly. Trimming both edges means reversing the stream to reuse
 * silenceremove on the tail, then a short pad so the last phoneme is not cut
 * flush against the end of the file.
 */
function encode(wav: Buffer, outFile: string): Promise<void> {
  const trim =
    "silenceremove=start_periods=1:start_threshold=-50dB:detection=peak";
  const filters = [trim, "areverse", trim, "areverse", "apad=pad_dur=0.1"];

  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-i", "pipe:0",
      "-af", filters.join(","),
      "-ac", "1",
      "-ar", String(SAMPLE_RATE),
      "-b:a", BITRATE,
      "-codec:a", "libmp3lame",
      "-y", outFile,
    ]);

    let stderr = "";
    ff.stderr.on("data", (c) => (stderr += c));
    ff.on("error", reject);
    ff.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited ${code}: ${stderr.trim()}`)),
    );
    ff.stdin.on("error", () => {
      // ffmpeg rejected the input and closed the pipe; the close handler
      // above carries the real error.
    });
    ff.stdin.end(wav);
  });
}

/** Simple worker pool — Promise.all over 226 fetches would flood the quota. */
async function pool<T>(items: T[], run: (item: T) => Promise<void>) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (cursor < items.length) {
        await run(items[cursor++]);
      }
    }),
  );
}

async function main() {
  if (listVoices) {
    const voices = await fetchVoices();
    console.log(`${LANGUAGE_CODE} voices (${voices.length}):\n`);
    for (const v of voices.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`  ${v.name.padEnd(34)}${v.ssmlGender.toLowerCase()}`);
    }
    console.log("\nSet GOOGLE_TTS_VOICE in .env to pick one.");
    return;
  }

  const voice = process.env.GOOGLE_TTS_VOICE ?? DEFAULT_VOICE;

  // Validate before spending 226 requests discovering the name was wrong.
  const available = await fetchVoices();
  if (!available.some((v) => v.name === voice)) {
    throw new Error(
      `Voice "${voice}" is not available for ${LANGUAGE_CODE}.\n` +
        "Run `pnpm audio:generate --list-voices` to see the current list.",
    );
  }

  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  let phrases: SourcedPhrase[] = loadPhrases();
  const total = phrases.length;

  if (!force) {
    phrases = phrases.filter(
      (p) => !fs.existsSync(path.join(AUDIO_DIR, `${p.slug}.mp3`)),
    );
  }
  if (Number.isFinite(limit)) phrases = phrases.slice(0, limit);

  console.log(`Voice   : ${voice}`);
  console.log(`Catalog : ${total} phrases`);
  console.log(
    `To do   : ${phrases.length}` +
      (force ? " (--force: regenerating all)" : " (missing only)"),
  );

  if (phrases.length === 0) {
    console.log("\nNothing to generate. Use --force to rebuild.");
    return;
  }
  console.log("");

  const failures: string[] = [];
  const oversized: string[] = [];
  let done = 0;
  let bytes = 0;

  await pool(phrases, async (phrase) => {
    const outFile = path.join(AUDIO_DIR, `${phrase.slug}.mp3`);
    try {
      const wav = await synthesize(phrase.textNl, voice);
      await encode(wav, outFile);

      const size = fs.statSync(outFile).size;
      bytes += size;
      if (size > SIZE_BUDGET_BYTES) {
        oversized.push(`${phrase.slug} (${Math.round(size / 1024)} KB)`);
      }
      done++;
      // A 226-phrase run is long enough that silence looks like a hang.
      console.log(
        `  ${String(done).padStart(3)}/${phrases.length}  ` +
          `${phrase.slug.padEnd(38)}${String(Math.round(size / 1024)).padStart(3)} KB`,
      );
    } catch (err) {
      // Keep going: one bad phrase should not cost the whole run. The file is
      // removed so a re-run retries it rather than treating it as done.
      fs.rmSync(outFile, { force: true });
      failures.push(`${phrase.slug}: ${err instanceof Error ? err.message : err}`);
    }
  });

  console.log("\nGeneration complete:");
  console.log(`  generated : ${done}`);
  console.log(`  failed    : ${failures.length}`);
  if (done > 0) {
    console.log(`  total size: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  average   : ${Math.round(bytes / done / 1024)} KB`);
  }

  if (oversized.length > 0) {
    console.log(`\n  Over the ${SIZE_BUDGET_BYTES / 1024} KB budget:`);
    for (const o of oversized) console.log(`    ${o}`);
  }
  if (failures.length > 0) {
    console.log("\n  Failures:");
    for (const f of failures) console.log(`    ${f}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Audio generation FAILED:");
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
