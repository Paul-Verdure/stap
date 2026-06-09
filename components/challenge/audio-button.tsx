"use client";

import { useRef, type ReactNode } from "react";

import { ListenButton } from "@/components/ui/listen-button";
import { cn } from "@/lib/cn";
import { phraseAudioUrl } from "@/lib/storage/phrase-audio";

/* ===========================================================================
   AudioButton (G5) — wires the G1 ListenButton to actual playback. Audio is
   Stap's primary pronunciation tool. `audioPath` is the phrase's storage path
   (phrases.audio_url); it is converted to a public URL. When no clip is synced
   yet (the common case until the catalog audio is uploaded) the button is
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

  const play = () => {
    if (!url) return;
    if (!audioRef.current) audioRef.current = new Audio(url);
    audioRef.current.currentTime = 0;
    void audioRef.current.play().catch(() => {
      // Autoplay/network failure is non-fatal; the user can retry.
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
