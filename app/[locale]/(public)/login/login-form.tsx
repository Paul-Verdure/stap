"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import {
  requestSignInCode,
  verifySignInCode,
  type SignInEmailState,
  type VerifyCodeState,
} from "@/lib/auth/actions";
import { Cta, SecondaryLink } from "@/components/ui/button";
import { Helper, Question } from "@/components/ui/typography";
import { TextInput } from "@/components/ui/text-field";

/* ===========================================================================
   Two-step passwordless sign-in, wired to lib/auth/actions.
   ---------------------------------------------------------------------------
   Step 1 emails a numeric code (and, in the same message, the magic link
   handled by /auth/confirm). Step 2 verifies the code. The code step is shown
   to everyone rather than sniffed onto iOS: it is the only path that works in
   an installed iOS web app (ADR 0005), it costs a desktop user nothing since
   the link still works, and one code path is one path to keep accessible.
=========================================================================== */

const SEND_INITIAL: SignInEmailState = { status: "idle" };
const VERIFY_INITIAL: VerifyCodeState = { status: "idle" };

export function LoginForm() {
  const t = useTranslations("Login");
  const [sent, sendAction, sending] = useActionState(
    requestSignInCode,
    SEND_INITIAL,
  );
  const [verified, verifyAction, verifying] = useActionState(
    verifySignInCode,
    VERIFY_INITIAL,
  );

  // Which step is on screen. Local, so "use another address" can walk back,
  // and reconciled against the send result so a fresh send always wins over
  // that manual reset (the adjust-state-on-change pattern used elsewhere).
  const [step, setStep] = useState<"email" | "code">("email");
  const [resent, setResent] = useState(false);
  const [prevSent, setPrevSent] = useState(sent);
  if (sent !== prevSent) {
    setPrevSent(sent);
    if (sent.status === "sent") {
      // A send that lands while step 2 is already up is a resend, which has
      // no visible effect of its own — hence the announcement below.
      setResent(step === "code");
      setStep("code");
    } else if (step === "code") {
      // A refused resend (the send limit, typically) must NOT walk back to
      // step 1: the code already in the inbox is still valid, and step 1
      // would only hit the same refusal. Report it and stay put.
      setResent(false);
    }
  }

  // The step-1 form unmounts, so focus would fall back to <body>. Move it to
  // the code field: its description (the helper) is what tells the user where
  // to find the code, and it is the only thing left to do on this screen.
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  if (step === "code") {
    const email = sent.email ?? "";
    return (
      <div className="flex flex-col gap-4">
        <Question as="h2">{t("codeTitle")}</Question>

        <form action={verifyAction} className="flex flex-col gap-4">
          <input type="hidden" name="email" defaultValue={email} />
          <TextInput
            ref={codeRef}
            label={t("codeLabel")}
            helper={t("codeSentTo", { email })}
            name="code"
            // No maxLength and no placeholder: the code's length is a Supabase
            // dashboard setting, and the action strips non-digits so pasting
            // the whole subject line works as well as typing the digits.
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="go"
            required
            aria-invalid={verified.status === "error" || undefined}
          />
          {verified.status === "error" ? (
            // Error copy stays muted ink on beige — no semantic red in the
            // palette.
            <p role="alert" className="text-helper text-muted">
              {t("codeError")}
            </p>
          ) : null}
          <Cta type="submit" disabled={verifying} fullWidth>
            {verifying ? t("verifying") : t("verify")}
          </Cta>
        </form>

        <p role="status" aria-live="polite" className="text-helper text-muted">
          {resent ? t("resent") : ""}
        </p>

        <div className="flex flex-col items-center gap-3">
          {/* Step 1's action, re-posted with the address already known. */}
          <form action={sendAction}>
            <input type="hidden" name="email" defaultValue={email} />
            <SecondaryLink type="submit" disabled={sending}>
              {sending ? t("sending") : t("resend")}
            </SecondaryLink>
          </form>
          {sent.status === "error" ? (
            <p role="alert" className="text-helper text-muted">
              {t("error")}
            </p>
          ) : null}
          <SecondaryLink
            onClick={() => {
              setResent(false);
              setStep("email");
            }}
          >
            {t("changeEmail")}
          </SecondaryLink>
        </div>

        <Helper>{t("linkHint")}</Helper>
      </div>
    );
  }

  // A fragment, so the subtitle and the form are laid out by the page's own
  // column spacing rather than nested one gap deeper.
  return (
    <>
      <Helper>{t("subtitle")}</Helper>
      <form action={sendAction} className="flex flex-col gap-4">
        <TextInput
          label={t("emailLabel")}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={t("emailPlaceholder")}
          defaultValue={sent.email ?? ""}
          aria-invalid={sent.status === "error" || undefined}
        />
        {sent.status === "error" ? (
          <p role="alert" className="text-helper text-muted">
            {t("error")}
          </p>
        ) : null}
        <Cta type="submit" disabled={sending} fullWidth>
          {sending ? t("sending") : t("submit")}
        </Cta>
      </form>
    </>
  );
}
