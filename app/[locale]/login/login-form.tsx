"use client";

import { useActionState } from "react";

import { requestMagicLink, type MagicLinkState } from "@/lib/auth/actions";

const INITIAL: MagicLinkState = { status: "idle" };

export type LoginLabels = {
  emailLabel: string;
  emailPlaceholder: string;
  submit: string;
  sending: string;
  sentTitle: string;
  sentBody: string;
  error: string;
};

// Client island: useActionState needs a Client Component. Copy is resolved
// server-side and passed as props so the next-intl client provider is not a
// prerequisite here.
export function LoginForm({ labels }: { labels: LoginLabels }) {
  const [state, formAction, pending] = useActionState(
    requestMagicLink,
    INITIAL,
  );

  if (state.status === "sent") {
    return (
      <div
        role="status"
        className="rounded-md border border-border bg-background p-4"
      >
        <p className="font-display text-[16px] font-bold">
          {labels.sentTitle}
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          {labels.sentBody}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label
        htmlFor="email"
        className="text-[13px] font-bold uppercase tracking-[0.04em] text-muted"
      >
        {labels.emailLabel}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder={labels.emailPlaceholder}
        className="border-structural rounded-md bg-surface px-3 py-2 text-[15px] outline-none focus:border-accent"
      />
      {state.status === "error" && (
        <p role="alert" className="text-[13px] text-destructive">
          {labels.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="border-structural mt-1 rounded-md bg-accent px-4 py-2.5 text-[14px] font-bold text-foreground disabled:opacity-60"
      >
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
