"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Cta, IconButton, SecondaryLink } from "@/components/ui/button";
import { Chip, TimeSlot } from "@/components/ui/chip";
import { BackIcon } from "@/components/ui/icons";
import { LangCard } from "@/components/ui/lang-card";
import { ProgressBar } from "@/components/ui/progress";
import { RadioGroup, RadioRow } from "@/components/ui/radio-group";
import { Card, HeroSurface, Tag } from "@/components/ui/surface";
import { TextInput } from "@/components/ui/text-field";
import { Eyebrow, Helper, Nl, Question, SectionRule } from "@/components/ui/typography";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  completeOnboarding,
  requestOnboardingLink,
} from "@/lib/onboarding-actions";
import {
  initialOnboardingState,
  isOnboardingComplete,
  ONBOARDING_LAST_STEP,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_TOTAL_STEPS,
  toOnboardingPayload,
  type DutchLevel,
  type Frequency,
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

const LEVELS: DutchLevel[] = ["A0", "A1", "A2", "B1", "B2"];
const FREQUENCIES: Frequency[] = ["DAILY", "THREE_PER_WEEK", "OWN_PACE"];
const REMINDER_SLOTS = ["08:00", "12:00", "18:00"];
const MAX_CONTEXTS = 4;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LifeContextOption = { slug: string; name: string };
type Phase = "collect" | "sending" | "sent" | "finalizing" | "error";

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
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<OnboardingState>(initialOnboardingState);
  const [phase, setPhase] = useState<Phase>("collect");
  const [email, setEmail] = useState("");
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

  const toggleContext = (slug: string) => {
    const has = state.contexts.includes(slug);
    if (!has && state.contexts.length >= MAX_CONTEXTS) return;
    commit({
      ...state,
      contexts: has
        ? state.contexts.filter((c) => c !== slug)
        : [...state.contexts, slug],
    });
  };

  // "Own pace" has no fixed cadence: clear any reminder.
  const pickFrequency = (frequency: Frequency) =>
    patch({
      frequency,
      reminderTime: frequency === "OWN_PACE" ? null : state.reminderTime,
    });

  const slotLabel = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return format.dateTime(new Date(2000, 0, 1, h, m), "time");
  };

  // Persist the profile for the authenticated user, then enter the app.
  const startFinalize = () => {
    const payload = toOnboardingPayload(state);
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

  // Screen 6 commit. Authenticated (e.g. returning from the magic link) writes
  // the profile directly; otherwise we email a magic link first.
  const handleFinish = () => {
    if (isAuthenticated) {
      startFinalize();
      return;
    }
    setPhase("sending");
    requestOnboardingLink(email.trim(), state.locale ?? "en").then((res) => {
      setPhase(res.status === "sent" ? "sent" : "error");
    });
  };

  const reminderDisabled = state.frequency === "OWN_PACE";
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
    isOnboardingComplete(state) &&
    (isAuthenticated || EMAIL_RE.test(email.trim()));

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

  if (phase === "sent") {
    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-4 p-5"
      >
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-2 rounded-md border-structural bg-surface p-5"
        >
          <p className="font-display text-greeting">{t("sentTitle")}</p>
          <Helper>{t("sentBody")}</Helper>
        </div>
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
            <RadioGroup
              value={state.level ?? ""}
              onValueChange={(v) => patch({ level: v as DutchLevel })}
            >
              {LEVELS.map((code) => (
                <RadioRow
                  key={code}
                  value={code}
                  label={tt(`levels.${code}.name`)}
                  description={tt(`levels.${code}.desc`)}
                  tag={<Tag tone="amber">{code}</Tag>}
                />
              ))}
            </RadioGroup>
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
            <div className="flex flex-wrap gap-2">
              {lifeContexts.map((c) => (
                <Chip
                  key={c.slug}
                  selected={state.contexts.includes(c.slug)}
                  onClick={() => toggleContext(c.slug)}
                >
                  {c.name}
                </Chip>
              ))}
            </div>
            <p aria-live="polite" className="text-helper text-muted">
              {t("contextsCount", {
                count: state.contexts.length,
                max: MAX_CONTEXTS,
              })}
            </p>
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
            <RadioGroup
              value={state.frequency ?? ""}
              onValueChange={(v) => pickFrequency(v as Frequency)}
            >
              {FREQUENCIES.map((f) => (
                <RadioRow
                  key={f}
                  value={f}
                  label={tt(`frequency.${f}.name`)}
                  description={tt(`frequency.${f}.desc`)}
                />
              ))}
            </RadioGroup>

            <SectionRule>{t("reminderTitle")}</SectionRule>
            <div className="flex flex-wrap gap-2">
              {REMINDER_SLOTS.map((slot) => (
                <TimeSlot
                  key={slot}
                  selected={state.reminderTime === slot}
                  disabled={reminderDisabled}
                  onClick={() => patch({ reminderTime: slot })}
                >
                  {slotLabel(slot)}
                </TimeSlot>
              ))}
              <TimeSlot
                selected={!reminderDisabled && state.reminderTime === null}
                disabled={reminderDisabled}
                onClick={() => patch({ reminderTime: null })}
              >
                {t("reminderOff")}
              </TimeSlot>
            </div>

            <div className="mt-auto">
              <Cta fullWidth disabled={!canContinue} onClick={goNext}>
                {t("next")}
              </Cta>
            </div>
          </>
        )}

        {/* Screen 6 — recap + commit (email then magic link, or direct write
            when already authenticated). First-challenge teaser is hardcoded;
            real selection is G4. */}
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

            {!isAuthenticated && (
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
