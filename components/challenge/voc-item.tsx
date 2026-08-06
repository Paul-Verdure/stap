import { AudioButton } from "@/components/challenge/audio-button";
import { Nl } from "@/components/ui/typography";

/* ===========================================================================
   VocItem (G5) — one key-word row in the preparation list: the Dutch word
   (invariant), its localized meaning, and a word-scale audio button.
=========================================================================== */
export function VocItem({
  nl,
  meaning,
  audioPath,
}: {
  nl: string;
  meaning: string;
  /** Omitted for rows with no clip of their own (e.g. the likely reply). */
  audioPath?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border-structural bg-surface px-4 py-3">
      <div className="flex flex-col">
        <span className="font-display text-body font-semibold">
          <Nl>{nl}</Nl>
        </span>
        <span className="text-helper text-muted">{meaning}</span>
      </div>
      <AudioButton audioPath={audioPath} scale="word" srLabel={<Nl>{nl}</Nl>} />
    </div>
  );
}
