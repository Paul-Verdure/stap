import { AudioButton } from "@/components/challenge/audio-button";

/* ===========================================================================
   ListenRow (G7.5) — the 140px listen disc plus its caption.
   ---------------------------------------------------------------------------
   The disc reuses AudioButton, which already renders disabled + dimmed when
   no clip is synced (the whole catalog's audio is still null). In that
   degraded state the caption says so honestly instead of pretending; once
   audio lands it becomes the "tap to replay" affordance with unlimited
   replays (no replay count). The disc's accessible name is a neutral "play"
   label — never the phrase text, which would spoil the answer.
=========================================================================== */
export function ListenRow({
  audioPath,
  playLabel,
  caption,
}: {
  audioPath: string | null;
  playLabel: string;
  caption: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <AudioButton audioPath={audioPath} scale="disc" srLabel={playLabel} />
      <p className="text-helper text-muted">{caption}</p>
    </div>
  );
}
