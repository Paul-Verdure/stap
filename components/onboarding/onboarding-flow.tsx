"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  ContextMultiSelect,
  FrequencyReminderSelect,
  LevelSelect,
  useSlotLabel,
} from "@/components/onboarding/fields";
import { Cta, IconButton, SecondaryLink } from "@/components/ui/button";
import { BackIcon } from "@/components/ui/icons";
import { LangCard } from "@/components/ui/lang-card";
import { ProgressBar } from "@/components/ui/progress";
import { Card, HeroSurface } from "@/components/ui/surface";
import { TextInput } from "@/components/ui/text-field";
import { Eyebrow, Helper, Nl, Question } from "@/components/ui/typography";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  completeOnboarding,
  requestOnboardingCode,
  verifyOnboardingCode,
} from "@/lib/onboarding-actions";
import {
  DEFAULT_TIMEZONE,
  browserTimezone,
} from "@/lib/timezone";
import {
  initialOnboardingState,
  isOnboardingComplete,
  ONBOARDING_LAST_STEP,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_TOTAL_STEPS,
  toOnboardingPayload,
  type OnboardingState,
} from "@/lib/onboarding";

const TITLE_KEY: Record<number, string> = {
  1: "s1Title",
  2: "s2Title",
  3: "s3Title",
  4: "s4Title",
  5: "s5Title",
  6: "s6Title",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LifeContextOption = { slug: string; name: string };
type Phase = "collect" | "sending" | "code" | "finalizing" | "error";
// One message at a time on the code screen, so the three cases that can
// follow a keystroke there stay mutually exclusive.
type CodeNotice = "none" | "invalid" | "resent" | "sendFailed";

export function OnboardingFlow({
  lifeContexts,
  isAuthenticated,
}: {
  lifeContexts: LifeContextOption[];
  isAuthenticated: boolean;
}) {
  const t = useTranslations("Onboarding");
  // next-intl's `t` is typed to literal keys; this loosened alias is for the
  // dynamic level/frequency/title lookups (all keys exist in the catalog).
  const tt = t as unknown as (key: string) => string;
  const slotLabel = useSlotLabel();
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<OnboardingState>(initialOnboardingState);
  const [phase, setPhase] = useState<Phase>("collect");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  // `isAuthenticated` is the server's answer at the time this page rendered.
  // Verifying a code below makes it stale without a new render, so from then
  // on the session is tracked here. It only ever goes false -> true, which is
  // what keeps the retry path honest: an account created, then a failed
  // profile write, must not send a second code.
  const [signedIn, setSignedIn] = useState(isAuthenticated);
  const [notice, setNotice] = useState<CodeNotice>("none");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const hydrated = useRef(false);

  // Hydrate once from localStorage (client only): the collected answers must
  // survive the Screen-0 locale switch and the magic-link round-trip.
  // localStorage is unavailable during SSR, so this read genuinely belongs in
  // an effect (a lazy initializer would diverge from the server snapshot).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from a browser-only store
        setState({ ...initialOnboardingState, ...JSON.parse(raw) });
      }
    } catch {
      // Ignore unreadable/corrupt storage — fall back to a fresh flow.
    }
    hydrated.current = true;
  }, []);

  // The recap screen unmounts when the code screen takes over, so focus would
  // fall back to <body>. Move it into the code field: the field's own
  // description is what tells the user where to find the code, and typing it
  // is the only thing left to do on that screen.
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (phase === "code") codeRef.current?.focus();
  }, [phase]);

  // Single writer: every mutation persists to localStorage and updates React
  // state together. There is deliberately no [state] persist effect — it would
  // race the mount-time hydration (the Screen-0 locale switch remounts the
  // tree) and clobber freshly hydrated answers back to the initial state.
  const commit = (next: OnboardingState) => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private mode) — in-memory state still works.
    }
    setState(next);
  };

  const patch = (p: Partial<OnboardingState>) => commit({ ...state, ...p });
  const goNext = () =>
    patch({ step: Math.min(ONBOARDING_LAST_STEP, state.step + 1) });
  const goBack = () => patch({ step: Math.max(0, state.step - 1) });

  // Screen 0: persist the choice + advance, then switch the UI locale live —
  // onboarding remounts and rehydrates in the chosen language at step 1.
  const pickLocale = (locale: Locale) => {
    commit({ ...state, locale, step: 1 });
    router.replace(pathname, { locale });
  };

  // Persist the profile for the authenticated user, then enter the app.
  const startFinalize = () => {
    const payload = toOnboardingPayload(
      state,
      browserTimezone() ?? DEFAULT_TIMEZONE,
    );
    if (!payload) {
      setPhase("error");
      return;
    }
    setPhase("finalizing");
    completeOnboarding(payload).then((res) => {
      if (res.status === "done") {
        try {
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        } catch {
          // Non-fatal.
        }
        router.replace("/today");
      } else {
        setPhase("error");
      }
    });
  };

  // Screen 6 commit. Authenticated (e.g. returning from the emailed link)
  // writes the profile directly; otherwise the account has to exist first, so
  // we send the code and hand over to the screen below.
  const handleFinish = () => {
    if (signedIn) {
      startFinalize();
      return;
    }
    setPhase("sending");
    requestOnboardingCode(email.trim(), state.locale ?? "en").then((res) => {
      setPhase(res.status === "sent" ? "code" : "error");
    });
  };

  // The code screen: verifying it signs the user in, and finalizing writes
  // the answers this browser has been holding all along. Chained rather than
  // redirected — a redirect would send a signed-in user with no profile back
  // through the flow, and the answers would have to be re-read from storage
  // to survive it.
  const handleVerify = (e: FormEvent) => {
    e.preventDefault();
    setNotice("none");
    setVerifying(true);
    verifyOnboardingCode(email.trim(), code).then((res) => {
      setVerifying(false);
      if (res.status === "verified") {
        setSignedIn(true);
        startFinalize();
      } else {
        setNotice("invalid");
      }
    });
  };

  // Same action as screen 6, re-posted with the address already known. The
  // previous code stops working the moment this one is minted.
  const handleResend = () => {
    setNotice("none");
    setResending(true);
    requestOnboardingCode(email.trim(), state.locale ?? "en").then((res) => {
      setResending(false);
      setNotice(res.status === "sent" ? "resent" : "sendFailed");
    });
  };

  const showProgress = state.step >= 2;
  const showBack = state.step >= 3;
  const progressValue = state.step - 1;

  const canContinue = (() => {
    switch (state.step) {
      case 2:
        return state.firstName.trim().length > 0;
      case 3:
        return state.level !== null;
      case 4:
        return state.contexts.length > 0;
      case 5:
        return state.frequency !== null;
      default:
        return true;
    }
  })();

  const canFinish =
    isOnboardingComplete(state) && (signedIn || EMAIL_RE.test(email.trim()));

  const rhythmText = () => {
    if (!state.frequency) return "";
    if (state.frequency === "OWN_PACE") return tt("frequency.OWN_PACE.name");
    const freq = tt(`frequency.${state.frequency}.name`);
    const rem = state.reminderTime ? slotLabel(state.reminderTime) : t("reminderOff");
    return `${freq} · ${rem}`;
  };

  const selectedContextNames = lifeContexts
    .filter((c) => state.contexts.includes(c.slug))
    .map((c) => c.name)
    .join(", ");

  // --- Terminal phases (no stepper chrome) ---------------------------------

  // The last step of sign-up, and the only one that works inside the
  // installed iOS app: a link opens in Safari, whose cookie jar the app
  // cannot see, so the code is the only credential that crosses (ADR 0005).
  if (phase === "code") {
    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-4 p-5"
      >
        <Question>{t("codeTitle")}</Question>

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <TextInput
            ref={codeRef}
            label={t("codeLabel")}
            helper={t("codeSentTo", { email: email.trim() })}
            // No maxLength and no placeholder: the code's length is a Supabase
            // dashboard setting, and normalizeCode strips everything that is
            // not a digit, so pasting the whole subject line works too.
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="go"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-invalid={notice === "invalid" || undefined}
          />
          {notice === "invalid" ? (
            // Error copy stays muted ink on beige — no semantic red in the
            // palette.
            <p role="alert" className="text-helper text-muted">
              {t("codeError")}
            </p>
          ) : null}
          {/* Same amber primary as the sign-in code screen: the two screens
              are one mechanism, and this one is not the sticky bottom
              commitment button that `commitment` describes. */}
          <Cta type="submit" disabled={verifying} fullWidth>
            {verifying ? t("verifying") : t("verify")}
          </Cta>
        </form>

        <p role="status" aria-live="polite" className="text-helper text-muted">
          {notice === "resent" ? t("resent") : ""}
        </p>

        <div className="flex flex-col items-center gap-3">
          <SecondaryLink onClick={handleResend} disabled={resending}>
            {resending ? t("sending") : t("resend")}
          </SecondaryLink>
          {notice === "sendFailed" ? (
            <p role="alert" className="text-helper text-muted">
              {t("errorGeneric")}
            </p>
          ) : null}
          {/* Back to the recap, answers intact, with the address editable. */}
          <SecondaryLink
            onClick={() => {
              setCode("");
              setNotice("none");
              setPhase("collect");
            }}
          >
            {t("changeEmail")}
          </SecondaryLink>
        </div>

        <Helper>{t("linkHint")}</Helper>
      </main>
    );
  }

  if (phase === "finalizing") {
    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-5"
      >
        <p role="status" aria-live="polite" className="text-body text-muted">
          {t("finalizing")}
        </p>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-4 p-5"
      >
        <div role="alert" className="flex flex-col gap-3">
          <Helper>{t("errorGeneric")}</Helper>
          <Cta onClick={() => setPhase("collect")} className="self-start">
            {t("retry")}
          </Cta>
        </div>
      </main>
    );
  }

  // --- Collection stepper ---------------------------------------------------

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col gap-6 p-5"
    >
      {(showProgress || showBack) && (
        <div className="flex items-center gap-3">
          {showBack && (
            <IconButton label={t("back")} size="sm" onClick={goBack}>
              <BackIcon className="h-5 w-5" />
            </IconButton>
          )}
          {showProgress && (
            <ProgressBar
              value={progressValue}
              total={ONBOARDING_TOTAL_STEPS}
              label={t("progress", {
                current: progressValue,
                total: ONBOARDING_TOTAL_STEPS,
              })}
            />
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-5">
        {/* Screen 0 — interface language (pre-flow, uncounted). */}
        {state.step === 0 && (
          <>
            <Question>{t("languagePrompt")}</Question>
            <div className="flex flex-col gap-3">
              <LangCard
                lang="en"
                label="English"
                sublabel="I speak English"
                selected={state.locale === "en"}
                onClick={() => pickLocale("en")}
              />
              <LangCard
                lang="fr"
                label="Français"
                sublabel="Je parle français"
                selected={state.locale === "fr"}
                onClick={() => pickLocale("fr")}
              />
            </div>
            <Helper>
              {t("languageTeaser")} <Nl>Nederlands komt later.</Nl>
            </Helper>
          </>
        )}

        {/* Screen 1 — welcome (uncounted). */}
        {state.step === 1 && (
          <>
            <Question>{tt(TITLE_KEY[1])}</Question>
            <Helper>{t("welcomeTagline")}</Helper>
            <div className="mt-auto flex flex-col gap-3">
              <Cta fullWidth onClick={goNext}>
                {t("getStarted")}
              </Cta>
              <SecondaryLink asChild className="self-center">
                <Link href="/login">{t("haveAccount")}</Link>
              </SecondaryLink>
            </div>
          </>
        )}

        {/* Screen 2 — first name. */}
        {state.step === 2 && (
          <>
            <Question>{tt(TITLE_KEY[2])}</Question>
            <TextInput
              label={t("nameLabel")}
              hideLabel
              helper={t("nameHelper")}
              placeholder={t("namePlaceholder")}
              autoComplete="given-name"
              value={state.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
            />
            <div className="mt-auto">
              <Cta fullWidth disabled={!canContinue} onClick={goNext}>
                {t("next")}
              </Cta>
            </div>
          </>
        )}

        {/* Screen 3 — Dutch level (single-select, hero + amber CEFR tag). */}
        {state.step === 3 && (
          <>
            <Question>{tt(TITLE_KEY[3])}</Question>
            <LevelSelect
              value={state.level}
              onChange={(level) => patch({ level })}
            />
            <div className="mt-auto">
              <Cta fullWidth disabled={!canContinue} onClick={goNext}>
                {t("next")}
              </Cta>
            </div>
          </>
        )}

        {/* Screen 4 — life contexts (multi-select 1–4). The "add a custom one"
            chip is deferred to v2 (a free context maps to no seeded phrases). */}
        {state.step === 4 && (
          <>
            <Question>{tt(TITLE_KEY[4])}</Question>
            <Helper>{t("contextsHelper")}</Helper>
            <ContextMultiSelect
              value={state.contexts}
              onChange={(contexts) => patch({ contexts })}
              options={lifeContexts}
            />
            <div className="mt-auto">
              <Cta fullWidth disabled={!canContinue} onClick={goNext}>
                {t("next")}
              </Cta>
            </div>
          </>
        )}

        {/* Screen 5 — frequency + reminder. */}
        {state.step === 5 && (
          <>
            <Question>{tt(TITLE_KEY[5])}</Question>
            <FrequencyReminderSelect
              frequency={state.frequency}
              reminderTime={state.reminderTime}
              onChange={({ frequency, reminderTime }) =>
                patch({ frequency, reminderTime })
              }
            />
            <div className="mt-auto">
              <Cta fullWidth disabled={!canContinue} onClick={goNext}>
                {t("next")}
              </Cta>
            </div>
          </>
        )}

        {/* Screen 6 — recap + commit (email then magic link, or direct write
            when already authenticated). The teaser deliberately does not name
            a phrase: selection runs server-side once the profile exists, from
            the level band intersected with these contexts, so anything named
            here would be a guess. It used to promise "Greet a colleague in
            Dutch" and then serve whatever the selector actually picked. */}
        {state.step === 6 && (
          <>
            <Question>{tt(TITLE_KEY[6])}</Question>
            {/* Invariant Dutch salutation. */}
            <p className="font-display text-greeting">
              <Nl>Klaar, {state.firstName}!</Nl>
            </p>

            <Card padding="md" className="flex flex-col gap-2">
              <RecapRow label={t("recapName")} value={state.firstName} />
              {state.level && (
                <RecapRow
                  label={t("recapLevel")}
                  value={`${tt(`levels.${state.level}.name`)} (${state.level})`}
                />
              )}
              <RecapRow label={t("recapContexts")} value={selectedContextNames} />
              <RecapRow label={t("recapRhythm")} value={rhythmText()} />
            </Card>

            <HeroSurface padding="md">
              <Eyebrow tone="accent">{t("teaserTitle")}</Eyebrow>
              <p className="mt-2 text-body text-hero-fg">{t("teaserBody")}</p>
            </HeroSurface>

            {!signedIn && (
              <TextInput
                label={t("emailLabel")}
                helper={t("emailHelper")}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            <div className="mt-auto flex flex-col gap-3">
              <Cta
                fullWidth
                variant="commitment"
                disabled={!canFinish}
                onClick={handleFinish}
              >
                {t("finish")}
              </Cta>
              <SecondaryLink className="self-center" onClick={() => patch({ step: 2 })}>
                {t("edit")}
              </SecondaryLink>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-helper text-muted">{label}</span>
      <span className="text-body text-foreground">{value}</span>
    </div>
  );
}
