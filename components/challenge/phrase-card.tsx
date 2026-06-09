import { AudioButton } from "@/components/challenge/audio-button";
import { Card } from "@/components/ui/surface";
import { Nl } from "@/components/ui/typography";

/* ===========================================================================
   PhraseCard (G5) — "the sentence" on the preparation screen: the Dutch
   phrase (invariant) with a sentence-scale audio button, an inline phonetic
   respelling strip (localized EN/FR aid — aria-hidden, since it approximates
   Dutch sounds with the UI language's letters and would mislead a screen
   reader), and the localized meaning.
=========================================================================== */
export function PhraseCard({
  nl,
  phonetic,
  meaning,
  audioPath,
}: {
  nl: string;
  phonetic: string;
  meaning: string;
  audioPath: string | null | undefined;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-question text-balance">
          <Nl>{nl}</Nl>
        </p>
        <AudioButton
          audioPath={audioPath}
          scale="sentence"
          srLabel={<Nl>{nl}</Nl>}
        />
      </div>

      <p
        aria-hidden
        className="self-start rounded-sm border border-hairline px-2 py-1 font-mono text-helper tracking-wide text-muted"
      >
        {phonetic}
      </p>

      <p className="text-body text-muted">{meaning}</p>
    </Card>
  );
}
