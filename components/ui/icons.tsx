import type { SVGProps } from "react";

/* ===========================================================================
   Stap icons — hand-drawn inline SVGs (no icon library: full control over the
   brutalist weight, zero bundle cost). All use `currentColor` so they inherit
   the parent's text color. Icons are decorative by default (aria-hidden);
   the surrounding button carries the accessible label.
=========================================================================== */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Speaker with sound waves — the audio/pronunciation icon (rendered amber). */
export function SpeakerIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        d="M11 5 6 9H3v6h3l5 4z"
        fill="currentColor"
        stroke="currentColor"
      />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a8 8 0 0 1 0 12" />
    </svg>
  );
}

/** Close (×) — modal heads, removable tags. */
export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

/** Sliders — the Journal filters trigger. */
export function FiltersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7h18M3 12h18M3 17h18" />
      <circle cx="8" cy="7" r="2" fill="currentColor" />
      <circle cx="16" cy="12" r="2" fill="currentColor" />
      <circle cx="11" cy="17" r="2" fill="currentColor" />
    </svg>
  );
}

/** Gear — the Profile settings trigger. */
export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.1 5.1l2.1 2.1M16.8 16.8l2.1 2.1M18.9 5.1l-2.1 2.1M7.2 16.8l-2.1 2.1" />
    </svg>
  );
}
