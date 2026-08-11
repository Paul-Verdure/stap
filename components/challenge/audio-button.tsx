"use client";

import { useRef, type ReactNode } from "react";

import { ListenButton } from "@/components/ui/listen-button";
import { cn } from "@/lib/cn";
import { phraseAudioUrl } from "@/lib/storage/phrase-audio";

/* ===========================================================================
   AudioButton (G5) — wires the G1 ListenButton to actual playback. Audio is
   Stap's primary pronunciation tool. `audioPath` is the phrase's storage path
   (phrases.audio_url); it is converted to a public URL. The catalog is fully
   voiced, so this normally plays; when a phrase has no clip the button is
   disabled and dimmed rather than silently doing nothing.
=========================================================================== */
export function AudioButton({
  audioPath,
  scale = "sentence",
  srLabel,
  className,
}: {
  audioPath: string | null | undefined;
  scale?: "word" | "sentence" | "disc";
  srLabel: ReactNode;
  className?: string;
}) {
  const url = phraseAudioUrl(audioPath);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const warmedRef = useRef(false);

  const play = () => {
    if (!url) return;

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      // CORS mode, and it is load-bearing rather than cosmetic. A media
      // element defaults to a *no-cors* request; the service worker can then
      // only see an opaque response (status 0, body unreadable from script),
      // and WebKit — every iOS browser, Brave included — ends up with nothing
      // playable and stays silent. Chrome happens to tolerate it, which is
      // why this only ever failed on a phone. The bucket sends
      // `access-control-allow-origin: *`, so asking for CORS costs nothing
      // and yields a real, readable 200.
      audio.crossOrigin = "anonymous";
      audio.src = url;
      audioRef.current = audio;
    }

    // Populate the offline cache with a *full* response. The element's own
    // request is a Range request, which the runtime cache rightly refuses to
    // store (a 206 is a fragment, not the file), so media playback alone
    // never fills the cache. This plain fetch stores the complete 200 that
    // RangeRequestsPlugin later slices to answer those Range requests.
    // Fire-and-forget, once per element; the clip is a few KB and the bucket
    // sends `cache-control: public, max-age=3600`, so it is close to free.
    if (!warmedRef.current) {
      warmedRef.current = true;
      void fetch(url).catch(() => {
        // Offline or blocked: playback below is unaffected.
      });
    }

    // Rewind only once there is media to rewind. Assigning currentTime while
    // readyState is HAVE_NOTHING throws InvalidStateError on WebKit, and it
    // throws *synchronously* — outside the play() promise below — so on a
    // first tap it would kill the handler before playback ever started. A
    // fresh element already starts at 0, so there is nothing to lose.
    if (audio.readyState > 0) {
      try {
        audio.currentTime = 0;
      } catch {
        // Not seekable yet; play() below still starts from the beginning.
      }
    }

    void audio.play().catch((err: unknown) => {
      // Non-fatal — the user can retry. But do not swallow it silently: this
      // is the only signal available when playback fails on a device we
      // cannot attach a debugger to, and "nothing happens" is exactly the
      // report this button generates.
      console.warn(`[audio] playback failed for ${url}:`, err);
    });
  };

  return (
    <ListenButton
      scale={scale}
      srLabel={srLabel}
      onClick={play}
      disabled={!url}
      className={cn(!url && "opacity-40", className)}
    />
  );
}
