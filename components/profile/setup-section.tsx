"use client";

import { type ReactNode, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  ContextMultiSelect,
  FrequencyReminderSelect,
  type LifeContextOption,
  LevelSelect,
  useSlotLabel,
} from "@/components/onboarding/fields";
import { SettingsRow } from "@/components/profile/settings-row";
import { Cta } from "@/components/ui/button";
import { BottomSheet, ModalClose } from "@/components/ui/modal";
import { SectionRule } from "@/components/ui/typography";
import { useRouter } from "@/i18n/navigation";
import type { DutchLevel, Frequency } from "@/lib/onboarding";
import {
  type SetupResult,
  updateContexts,
  updateFrequency,
  updateLevel,
} from "@/lib/profile-actions";

/* ===========================================================================
   SetupSection (G8, step 3) — the editable "My setup" block. Each row shows
   the current value and opens a BottomSheet editor that reuses the exact
   onboarding field controls; saving calls an RLS-scoped server action and
   refreshes the server-rendered values. The whole section announces "Saved"
   politely after any successful write (a11y contract).

   The Interface-language row is intentionally absent here: editing the UI
   locale is the Language modal (step 6), which also navigates the locale
   route and reloads — a different concern from these same-page column writes.
=========================================================================== */

export function SetupSection({
  level,
  contextSlugs,
  frequency,
  reminderTime,
  options,
}: {
  level: DutchLevel | null;
  contextSlugs: string[];
  frequency: Frequency | null;
  reminderTime: string | null;
  options: LifeContextOption[];
}) {
  const t = useTranslations("Profile.setup");
  // Going "" -> "Saved" on each save is a content change, so AT re-announces.
  const [saved, setSaved] = useState("");
  const announceSaved = () => {
    setSaved(t("saved"));
    setTimeout(() => setSaved(""), 1500);
  };

  const selectedNames = options
    .filter((o) => contextSlugs.includes(o.slug))
    .map((o) => o.name)
    .join(", ");

  return (
    <section id="setup" className="flex flex-col gap-3">
      <SectionRule>{t("title")}</SectionRule>

      <div className="flex flex-col gap-3">
        <LevelEditor current={level} onSaved={announceSaved} />
        <ContextsEditor
          current={contextSlugs}
          currentNames={selectedNames}
          options={options}
          onSaved={announceSaved}
        />
        <FrequencyEditor
          frequency={frequency}
          reminderTime={reminderTime}
          onSaved={announceSaved}
        />
      </div>

      <span aria-live="polite" className="sr-only">
        {saved}
      </span>
    </section>
  );
}

/* --- Shared editor footer + save plumbing -------------------------------- */

function EditorFooter({
  canSave,
  pending,
  onSave,
}: {
  canSave: boolean;
  pending: boolean;
  onSave: () => void;
}) {
  const t = useTranslations("Profile.setup");
  return (
    <>
      <ModalClose asChild>
        <Cta variant="ink">{t("cancel")}</Cta>
      </ModalClose>
      <Cta onClick={onSave} disabled={!canSave || pending}>
        {pending ? t("saving") : t("save")}
      </Cta>
    </>
  );
}

/** Manages the open/pending/error lifecycle shared by every editor. */
function useEditor(onSaved: () => void) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const save = (action: () => Promise<SetupResult>) => {
    setError(false);
    start(async () => {
      const res = await action();
      if (res.status === "done") {
        setOpen(false);
        onSaved();
        router.refresh();
      } else {
        setError(true);
      }
    });
  };

  return { open, setOpen, error, setError, pending, save };
}

function EditorBody({ error, children }: { error: boolean; children: ReactNode }) {
  const t = useTranslations("Profile.setup");
  return (
    <div className="flex flex-col gap-3 pb-2">
      {children}
      {error ? (
        <p role="alert" className="text-helper text-accent">
          {t("saveError")}
        </p>
      ) : null}
    </div>
  );
}

/* --- The three editors --------------------------------------------------- */

function LevelEditor({
  current,
  onSaved,
}: {
  current: DutchLevel | null;
  onSaved: () => void;
}) {
  const t = useTranslations("Profile.setup");
  const tOnb = useTranslations("Onboarding") as unknown as (k: string) => string;
  const { open, setOpen, error, setError, pending, save } = useEditor(onSaved);
  const [draft, setDraft] = useState<DutchLevel | null>(current);

  const display = current ? `${current} · ${tOnb(`levels.${current}.name`)}` : t("notSet");

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setDraft(current);
          setError(false);
        }
        setOpen(o);
      }}
      trigger={<SettingsRow label={t("levelLabel")} value={display} />}
      title={t("levelTitle")}
      footer={
        <EditorFooter
          canSave={draft !== null}
          pending={pending}
          onSave={() => draft && save(() => updateLevel(draft))}
        />
      }
    >
      <EditorBody error={error}>
        <LevelSelect value={draft} onChange={setDraft} />
      </EditorBody>
    </BottomSheet>
  );
}

function ContextsEditor({
  current,
  currentNames,
  options,
  onSaved,
}: {
  current: string[];
  currentNames: string;
  options: LifeContextOption[];
  onSaved: () => void;
}) {
  const t = useTranslations("Profile.setup");
  const { open, setOpen, error, setError, pending, save } = useEditor(onSaved);
  const [draft, setDraft] = useState<string[]>(current);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setDraft(current);
          setError(false);
        }
        setOpen(o);
      }}
      trigger={
        <SettingsRow
          label={t("contextsLabel")}
          value={currentNames || t("notSet")}
        />
      }
      title={t("contextsTitle")}
      footer={
        <EditorFooter
          canSave={draft.length >= 1}
          pending={pending}
          onSave={() => save(() => updateContexts(draft))}
        />
      }
    >
      <EditorBody error={error}>
        <ContextMultiSelect value={draft} onChange={setDraft} options={options} />
      </EditorBody>
    </BottomSheet>
  );
}

function FrequencyEditor({
  frequency,
  reminderTime,
  onSaved,
}: {
  frequency: Frequency | null;
  reminderTime: string | null;
  onSaved: () => void;
}) {
  const t = useTranslations("Profile.setup");
  const tOnb = useTranslations("Onboarding") as unknown as (k: string) => string;
  const slotLabel = useSlotLabel();
  const { open, setOpen, error, setError, pending, save } = useEditor(onSaved);
  const [draftFreq, setDraftFreq] = useState<Frequency | null>(frequency);
  const [draftReminder, setDraftReminder] = useState<string | null>(reminderTime);

  const display = (() => {
    if (!frequency) return t("notSet");
    const name = tOnb(`frequency.${frequency}.name`);
    if (frequency === "OWN_PACE") return name;
    const rem = reminderTime ? slotLabel(reminderTime) : tOnb("reminderOff");
    return `${name} · ${rem}`;
  })();

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setDraftFreq(frequency);
          setDraftReminder(reminderTime);
          setError(false);
        }
        setOpen(o);
      }}
      trigger={<SettingsRow label={t("frequencyLabel")} value={display} />}
      title={t("frequencyTitle")}
      footer={
        <EditorFooter
          canSave={draftFreq !== null}
          pending={pending}
          onSave={() =>
            draftFreq && save(() => updateFrequency(draftFreq, draftReminder))
          }
        />
      }
    >
      <EditorBody error={error}>
        <FrequencyReminderSelect
          frequency={draftFreq}
          reminderTime={draftReminder}
          onChange={({ frequency: f, reminderTime: r }) => {
            setDraftFreq(f);
            setDraftReminder(r);
          }}
        />
      </EditorBody>
    </BottomSheet>
  );
}
