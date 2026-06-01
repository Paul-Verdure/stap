"use client";

import { useTheme } from "./theme-provider";

// Minimal tri-state preference picker. The branded `IconButton` arrives in
// G1.4; this is the dev surface that proves dark-mode token swap works.
export function ThemeToggle() {
  const { preference, resolved, setPreference } = useTheme();

  const options: { value: typeof preference; label: string }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="border-structural inline-flex items-center gap-0 rounded-md bg-surface p-1"
    >
      {options.map((opt) => {
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(opt.value)}
            // No color transition: theme/active changes are instant (brutalist
            // aesthetic + reduced-motion + avoids mid-transition contrast
            // false-positives in axe).
            className={[
              "rounded-sm px-3 py-1.5 text-helper font-semibold",
              active
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
      <span className="ml-2 pr-2 text-helper text-muted">
        Active: <span className="text-foreground">{resolved}</span>
      </span>
    </div>
  );
}
