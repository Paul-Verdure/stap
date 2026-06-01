import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { CheckIcon } from "./icons";

/* ===========================================================================
   CheckboxRow (G1.6) — independent multi-select option (advanced filters:
   with photo / with story / with added words). Native <input type=checkbox>
   (no special group keyboard behavior needed), visually replaced by a custom
   box with an AMBER check (the "control on-state = amber-fill" rule).

   Presentational + prop-forwarding: the caller passes checked/defaultChecked/
   name/onChange. The wrapping <label> gives implicit association (no id), and
   the focus ring is mirrored onto the visible box via peer-focus-visible.
=========================================================================== */

export function CheckboxRow({
  label,
  description,
  className,
  ...props
}: {
  label: ReactNode;
  description?: ReactNode;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <span className="relative mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center">
        <input type="checkbox" className="peer sr-only" {...props} />
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-[4px] border-structural bg-surface",
            "peer-checked:border-accent peer-checked:bg-accent",
            "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
          )}
        />
        <CheckIcon
          aria-hidden
          className="pointer-events-none relative h-3 w-3 text-on-accent opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-body">{label}</span>
        {description ? (
          <span className="text-helper text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
