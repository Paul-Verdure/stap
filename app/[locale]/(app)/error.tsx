"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { Cta } from "@/components/ui/button";
import { Eyebrow, Helper } from "@/components/ui/typography";

// Branded error boundary for (app) routes. Next 16 passes `unstable_retry`
// (not `reset`) to re-render the failed segment. Focus moves to the heading
// on mount (a11y contract: focus the new region's heading on transition); the
// card is a live region so AT announces the failure.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const t = useTranslations("Error");

  useEffect(() => {
    headingRef.current?.focus();
    // Surface the underlying error in dev tooling / monitoring.
    console.error(error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center p-5"
    >
      <div
        role="alert"
        className="border-structural flex w-full max-w-md flex-col gap-4 rounded-lg bg-surface p-6"
      >
        <Eyebrow>Stap</Eyebrow>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-question text-balance outline-none"
        >
          {t("title")}
        </h1>
        <Helper>{t("body")}</Helper>
        <Cta onClick={() => unstable_retry()} className="mt-1 self-start">
          {t("retry")}
        </Cta>
      </div>
    </main>
  );
}
