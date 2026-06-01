"use client";

import {
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from "react";

import { cn } from "@/lib/cn";

/* ===========================================================================
   Text fields (G1.6). Client components: they own id generation (useId) so
   label/helper associations are robust without the caller wiring ids.
   Controlled or uncontrolled — the caller passes value/defaultValue.
=========================================================================== */

/* ---------------------------------------------------------------------------
   TextInput — single-line. Syne 22/700 with the amber blinking caret (the
   onboarding name field). The label is required; hide it visually with
   `hideLabel` when context already names the field.
--------------------------------------------------------------------------- */
export function TextInput({
  label,
  hideLabel = false,
  helper,
  id: idProp,
  className,
  ...props
}: {
  label: string;
  hideLabel?: boolean;
  helper?: ReactNode;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const helperId = helper ? `${id}-helper` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn("text-helper font-medium", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <input
        id={id}
        aria-describedby={helperId}
        className={cn(
          "caret-amber-blink w-full rounded-md border-structural bg-surface px-4 py-3 font-display text-greeting text-foreground",
          "placeholder:font-normal placeholder:text-muted",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      {helper ? (
        <p id={helperId} className="text-helper text-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Textarea — multi-line with a character counter. `maxLength` enforces the
   limit natively; the visible counter is decorative (aria-hidden) to avoid
   spamming screen readers on every keystroke, while a static describedby
   hint communicates the limit.
--------------------------------------------------------------------------- */
export function Textarea({
  label,
  hideLabel = false,
  helper,
  maxLength,
  defaultValue,
  id: idProp,
  className,
  onChange,
  ...props
}: {
  label: string;
  hideLabel?: boolean;
  helper?: ReactNode;
  className?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const helperId = helper || maxLength ? `${id}-helper` : undefined;
  const [count, setCount] = useState(
    typeof defaultValue === "string" ? defaultValue.length : 0,
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn("text-helper font-medium", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <textarea
        id={id}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-describedby={helperId}
        onChange={(event) => {
          setCount(event.target.value.length);
          onChange?.(event);
        }}
        className={cn(
          "caret-amber-blink min-h-28 w-full rounded-md border-structural bg-surface px-4 py-3 text-body text-foreground",
          "placeholder:text-muted",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <div className="flex items-center justify-between gap-3">
        {helper ? (
          <p id={helperId} className="text-helper text-muted">
            {helper}
          </p>
        ) : (
          <span />
        )}
        {maxLength ? (
          <span aria-hidden className="text-helper tabular-nums text-muted">
            {count} / {maxLength}
          </span>
        ) : null}
      </div>
    </div>
  );
}
