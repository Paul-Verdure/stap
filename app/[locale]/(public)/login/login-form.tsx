"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { requestMagicLink, type LoginState } from "./actions";
import { Cta } from "@/components/ui/button";
import { Helper } from "@/components/ui/typography";
import { TextInput } from "@/components/ui/text-field";

const INITIAL: LoginState = { status: "idle" };

export function LoginForm() {
  const t = useTranslations("Login");
  const locale = useLocale();
  const [state, action, pending] = useActionState(requestMagicLink, INITIAL);

  // Confirmation: announced politely; the form is replaced so there is no
  // ambiguity about what to do next (open the email on this device).
  if (state.status === "sent") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-2 rounded-md border-structural bg-surface p-4"
      >
        <p className="font-display text-greeting">{t("sentTitle")}</p>
        <Helper>{t("sentBody", { email: state.email })}</Helper>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <TextInput
        label={t("emailLabel")}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder={t("emailPlaceholder")}
        helper={state.status === "invalid" ? t("invalidEmail") : undefined}
        aria-invalid={state.status === "invalid" || undefined}
      />
      <Cta type="submit" disabled={pending} fullWidth>
        {pending ? t("sending") : t("submit")}
      </Cta>
    </form>
  );
}
