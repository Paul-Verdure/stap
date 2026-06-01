"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ===========================================================================
   RadioGroup + RadioRow (G1.6) — single-select built on Radix RadioGroup
   (roving tabindex, arrow-key navigation, aria-checked). Used by the
   onboarding Dutch-level / frequency steps and the dark-mode picker.

   Selection language = the HERO treatment on the whole row (ink fill, beige
   text) + an amber radio dot. This is the "container selection = hero"
   rule, distinct from the "control on-state = amber-fill" of Toggle/Checkbox.
=========================================================================== */

export function RadioGroup({
  className,
  children,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      className={cn("flex flex-col gap-2.5", className)}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Root>
  );
}

export function RadioRow({
  value,
  label,
  description,
  tag,
  className,
}: {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  /** Optional trailing slot, e.g. an amber CEFR <Tag>. */
  tag?: ReactNode;
  className?: string;
}) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-lg border-structural bg-surface px-4 py-3.5 text-left text-foreground",
        "data-[state=checked]:border-hero-border data-[state=checked]:bg-hero-bg data-[state=checked]:text-hero-fg",
        className,
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-body font-semibold">{label}</span>
        {description ? (
          <span className="text-helper text-muted group-data-[state=checked]:text-hero-muted">
            {description}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {tag}
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-current">
          <RadioGroupPrimitive.Indicator className="block h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
      </span>
    </RadioGroupPrimitive.Item>
  );
}
