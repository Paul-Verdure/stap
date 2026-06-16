import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

import { ChevronIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/* ===========================================================================
   SettingsRow (G8) — a labelled, tappable row showing a setting's current
   value and a chevron affordance. Used as the trigger for the "My setup"
   editors (and the account actions). forwardRef + prop spread so it composes
   as a Radix Dialog.Trigger (`asChild`), which restores focus to it on close.
   Phrasing-only content so it is a valid <button>.
=========================================================================== */

const ROW =
  "border-structural flex w-full items-center justify-between gap-4 rounded-md bg-surface px-4 py-3 text-left";

export const SettingsRow = forwardRef<
  HTMLButtonElement,
  {
    label: ReactNode;
    value: ReactNode;
    className?: string;
    // Omit the HTML `value` attribute so our ReactNode `value` prop wins.
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value">
>(function SettingsRow({ label, value, className, ...props }, ref) {
  return (
    <button ref={ref} type="button" className={cn(ROW, className)} {...props}>
      <span className="flex flex-col gap-0.5">
        <span className="text-helper text-muted">{label}</span>
        <span className="text-body font-medium text-foreground">{value}</span>
      </span>
      <ChevronIcon className="h-5 w-5 shrink-0 text-muted" />
    </button>
  );
});
