import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { SpeakerIcon } from "./icons";

/* ===========================================================================
   ListenButton (G1.4) — audio is Stap's primary pronunciation tool, so this
   is one shape reused at three scales: inline word, sentence, and the 140px
   "listen" disc (Game C).

   INVARIANT treatment (like the hero): always an ink circle with an amber
   speaker, in both themes. If it inverted in dark mode the amber speaker
   would land on a beige circle (~1.95:1) — instead `surface-hero` keeps the
   circle ink (beige border in dark) so the amber icon stays ~10:1.

   A11y: the speaker glyph is decorative; the accessible name comes from the
   `srLabel` rendered in an sr-only span — pass the Dutch phrase wrapped in
   <Nl> so screen readers pronounce it in Dutch (an aria-label string could
   not carry lang="nl"). Playback wiring lives in AudioButton; here the
   button forwards onClick.

   Touch affordances match IconButton, the equivalent round control. They were
   missing until a report of the button "not reacting" on a phone:

   - `active:opacity-70` is the only press feedback a touch device gets. There
     is no cursor and no hover, so without it a tap looks identical to a tap
     that missed — which is indistinguishable from a dead button when the
     audio is also inaudible (an iPhone's ringer switch mutes HTMLAudioElement).
   - `touch-manipulation` stops the browser reserving the tap for double-tap
     zoom. Replaying is the natural gesture on a pronunciation button, and on
     the 32px word disc a quick second tap otherwise zooms the page.
=========================================================================== */

type ListenScale = "word" | "sentence" | "disc";

const SCALE: Record<ListenScale, { circle: string; icon: string }> = {
  word: { circle: "h-8 w-8", icon: "h-4 w-4" }, // 32px — inline, ≥24px target
  sentence: { circle: "h-11 w-11", icon: "h-5 w-5" }, // 44px
  disc: { circle: "h-[140px] w-[140px]", icon: "h-14 w-14" }, // 140px
};

export function ListenButton({
  scale = "sentence",
  srLabel,
  className,
  ...props
}: {
  scale?: ListenScale;
  /** Accessible name; wrap the Dutch phrase in <Nl> for correct pronunciation. */
  srLabel: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const s = SCALE[scale];
  return (
    <button
      type="button"
      className={cn(
        // A disabled button never matches :active, so the dimmed state the
        // caller applies for a missing clip is unaffected by the press style.
        "surface-hero inline-grid touch-manipulation shrink-0 place-items-center rounded-full text-accent active:opacity-70",
        s.circle,
        className,
      )}
      {...props}
    >
      <SpeakerIcon className={s.icon} />
      <span className="sr-only">{srLabel}</span>
    </button>
  );
}
