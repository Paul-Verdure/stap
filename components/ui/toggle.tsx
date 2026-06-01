"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { type ComponentProps, type ReactNode, useId } from "react";

import { cn } from "@/lib/cn";

/* ===========================================================================
   Toggle (G1.6) — labelled on/off switch built on Radix Switch (role=switch,
   aria-checked, Space/Enter). Amber track when on; the thumb is invariant ink
   on amber (text-on-accent) so it stays visible in both themes. Only the
   thumb's slide animates (transform), gated by reduced-motion; color flips
   instantly (brutalist + avoids mid-transition contrast artefacts).
=========================================================================== */

export function Toggle({
  label,
  description,
  id: idProp,
  className,
  ...props
}: {
  label: ReactNode;
  description?: ReactNode;
  className?: string;
} & ComponentProps<typeof SwitchPrimitive.Root>) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label htmlFor={id} className="flex flex-col gap-0.5">
        <span className="text-body font-medium">{label}</span>
        {description ? (
          <span className="text-helper text-muted">{description}</span>
        ) : null}
      </label>
      <SwitchPrimitive.Root
        id={id}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-structural bg-surface",
          "data-[state=checked]:border-accent data-[state=checked]:bg-accent",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "block h-4 w-4 translate-x-1 rounded-full bg-foreground",
            "transition-transform duration-150 will-change-transform motion-reduce:transition-none",
            "data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-on-accent",
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
}
