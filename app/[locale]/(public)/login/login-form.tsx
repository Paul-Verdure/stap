"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { requestMagicLink, type MagicLinkState } from "@/lib/auth/actions";
import { Cta } from "@/components/ui/button";
import { Helper } from "@/components/ui/typography";
import { TextInput } from "@/components/ui/text-field";

const INITIAL: MagicLinkState = { status: "idle" };

// Design-system-styled magic-link form, wired to the shared auth action
// (lib/auth/actions). The action emails a token_hash link handled by
// /auth/confirm; locale is resolved server-side (no hidden field needed).
export function LoginForm() {
  const t = useTranslations("Login");
  const [state, action, pending] = useActionState(requestMagicLink, INITIAL);

  // Confirmation: announced politely; the form is replaced so the next step
  // (open the email on this device) is unambiguous.
  if (state.status === "sent") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-2 rounded-md border-structural bg-surface p-4"
      >
        <p className="font-display text-greeting">{t("sentTitle")}</p>
        <Helper>{t("sentBody")}</Helper>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextInput
        label={t("emailLabel")}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder={t("emailPlaceholder")}
        aria-invalid={state.status === "error" || undefined}
      />
      {state.status === "error" ? (
        // Error copy stays muted ink on beige — no semantic red in the palette.
        <p role="alert" className="text-helper text-muted">
          {t("error")}
        </p>
      ) : null}
      <Cta type="submit" disabled={pending} fullWidth>
        {pending ? t("sending") : t("submit")}
      </Cta>
    </form>
  );
}
