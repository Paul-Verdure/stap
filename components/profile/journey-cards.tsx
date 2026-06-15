"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Cta } from "@/components/ui/button";
import { ChevronIcon } from "@/components/ui/icons";
import { CenteredModal, ModalClose } from "@/components/ui/modal";
import { type RhythmDay, RhythmUnit, countSteps } from "@/components/ui/rhythm";
import { Tag } from "@/components/ui/surface";

/* ===========================================================================
   JourneyCards (G8) — the two "My journey" cells: a weekly-rhythm preview and
   a season recap. Both are real-ish previews but inert: tapping either opens a
   shared "Coming in v2" placeholder (CenteredModal) — no broken routes, no
   half-built screens.

   Each cell is the dialog's own Dialog.Trigger (via CenteredModal's `trigger`
   slot), so Radix tracks it and restores focus to it on close. The triggers
   are <button>s (they open a dialog, they do not navigate), so they carry only
   phrasing content: the rhythm row is built from RhythmUnit spans directly,
   not the MiniRhythm wrapper (which nests block elements a button may not hold).
=========================================================================== */

const CELL =
  "border-structural flex w-full items-center justify-between gap-4 rounded-md bg-surface px-4 py-3 text-left";

/** The shared, inert "Coming in v2" placeholder, opened by either cell. */
function V2Modal({ trigger }: { trigger: ReactNode }) {
  const t = useTranslations("Profile.journey");
  return (
    <CenteredModal
      trigger={trigger}
      title={t("v2.title")}
      description={t("v2.subtitle")}
      footer={
        <ModalClose asChild>
          <Cta variant="ink">{t("v2.dismiss")}</Cta>
        </ModalClose>
      }
    >
      <p className="pb-2 text-body text-muted">{t("v2.body")}</p>
    </CenteredModal>
  );
}

export function JourneyCards({
  weekRhythm,
  seasonSteps,
  contextCount,
}: {
  weekRhythm: RhythmDay[];
  seasonSteps: number;
  contextCount: number;
}) {
  const t = useTranslations("Profile.journey");
  const weekSteps = countSteps(weekRhythm);

  return (
    <ul className="flex list-none flex-col gap-3 p-0">
      <li>
        <V2Modal
          trigger={
            <button type="button" className={CELL}>
              <span className="flex flex-col gap-2">
                <span className="font-display text-body font-semibold text-foreground">
                  {t("rhythm.title")}
                </span>
                <span aria-hidden className="flex items-center gap-1.5">
                  {weekRhythm.map((d, i) => (
                    <RhythmUnit
                      key={i}
                      state={d.state}
                      today={d.today}
                      size="md"
                    />
                  ))}
                </span>
                <span className="text-helper text-muted">
                  {t("rhythm.caption", { steps: weekSteps })}
                </span>
              </span>
              <ChevronIcon className="h-5 w-5 shrink-0 text-muted" />
            </button>
          }
        />
      </li>

      <li>
        <V2Modal
          trigger={
            <button type="button" className={CELL}>
              <span className="flex flex-col gap-2">
                <span className="flex items-center gap-2">
                  <span className="font-display text-body font-semibold text-foreground">
                    {t("season.title")}
                  </span>
                  <Tag tone="amber">{t("season.recap")}</Tag>
                </span>
                <span className="text-helper text-muted">
                  {t("season.summary", {
                    steps: seasonSteps,
                    contexts: contextCount,
                  })}
                </span>
              </span>
              <ChevronIcon className="h-5 w-5 shrink-0 text-muted" />
            </button>
          }
        />
      </li>
    </ul>
  );
}
