"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Cta, IconButton, SecondaryLink } from "@/components/ui/button";
import { BackIcon } from "@/components/ui/icons";
import { LangCard } from "@/components/ui/lang-card";
import { ProgressBar } from "@/components/ui/progress";
import { Helper, Question } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import {
  initialOnboardingState,
  ONBOARDING_LAST_STEP,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_TOTAL_STEPS,
  type OnboardingState,
} from "@/lib/onboarding";

// Step → title message key (screens 1–6). Screen 0 uses its own prompt.
const TITLE_KEY: Record<number, string> = {
  1: "s1Title",
  2: "s2Title",
  3: "s3Title",
  4: "s4Title",
  5: "s5Title",
  6: "s6Title",
};

export function OnboardingFlow() {
  const t = useTranslations("Onboarding");
  // next-intl's `t` is typed to literal keys; this loosened alias is for the
  // step→title lookup above (all keys exist in the catalog).
  const tt = t as unknown as (key: string) => string;

  const [state, setState] = useState<OnboardingState>(initialOnboardingState);
  const hydrated = useRef(false);

  // Hydrate once from localStorage (client only): the collected answers must
  // survive the Screen-0 locale switch and the later magic-link round-trip.
  // localStorage is unavailable during SSR, so this read genuinely belongs in
  // an effect (a lazy initializer would diverge from the server snapshot and
  // cause a hydration mismatch).
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

  // Persist after hydration so the initial state never clobbers saved answers.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private mode) — the flow still works.
    }
  }, [state]);

  const patch = (p: Partial<OnboardingState>) =>
    setState((s) => ({ ...s, ...p }));
  const goNext = () =>
    patch({ step: Math.min(ONBOARDING_LAST_STEP, state.step + 1) });
  const goBack = () => patch({ step: Math.max(0, state.step - 1) });

  // Screens 2–6 are counted (1/5 … 5/5); screen 2 has no back (would return
  // to Welcome), so the back control starts at screen 3.
  const showProgress = state.step >= 2;
  const showBack = state.step >= 3;
  const progressValue = state.step - 1;

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
        {/* Screen 0 — interface language (pre-flow, uncounted). Picking a card
            stores the choice and advances; live locale switch lands in step 4. */}
        {state.step === 0 && (
          <>
            <Question>{t("languagePrompt")}</Question>
            <div className="flex flex-col gap-3">
              <LangCard
                lang="en"
                label="English"
                sublabel="I speak English"
                selected={state.locale === "en"}
                onClick={() => patch({ locale: "en", step: 1 })}
              />
              <LangCard
                lang="fr"
                label="Français"
                sublabel="Je parle français"
                selected={state.locale === "fr"}
                onClick={() => patch({ locale: "fr", step: 1 })}
              />
            </div>
          </>
        )}

        {/* Screen 1 — welcome (uncounted). */}
        {state.step === 1 && (
          <>
            <Question>{tt(TITLE_KEY[1])}</Question>
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

        {/* Screens 2–5 — placeholders; real content arrives in steps 4–5. */}
        {state.step >= 2 && state.step <= 5 && (
          <>
            <Question>{tt(TITLE_KEY[state.step])}</Question>
            <Helper>—</Helper>
            <div className="mt-auto">
              <Cta fullWidth onClick={goNext}>
                {t("next")}
              </Cta>
            </div>
          </>
        )}

        {/* Screen 6 — recap + commit. Persistence is wired in step 6. */}
        {state.step === 6 && (
          <>
            <Question>{tt(TITLE_KEY[6])}</Question>
            <div className="mt-auto">
              <Cta fullWidth disabled>
                {t("finish")}
              </Cta>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
