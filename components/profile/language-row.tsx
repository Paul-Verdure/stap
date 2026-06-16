"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { SettingsRow } from "@/components/profile/settings-row";
import { Cta } from "@/components/ui/button";
import { LangCard } from "@/components/ui/lang-card";
import { CenteredModal, ModalClose } from "@/components/ui/modal";
import { usePathname } from "@/i18n/navigation";
import { updateLocale } from "@/lib/profile-actions";

/* ===========================================================================
   LanguageRow (G8, step 6) — the "Interface language" setup row + its
   CenteredModal. The two cards are each labelled in their OWN language and are
   invariant (never localized). Confirming writes uiLocale and HARD-navigates
   to the chosen locale route so the whole app reloads in the new language;
   cancelling leaves everything unchanged.
=========================================================================== */

type Locale = "en" | "fr";

// Endonyms + own-language descriptors — invariant, never translated.
const CARDS: { value: Locale; label: string; sublabel: string }[] = [
  { value: "en", label: "English", sublabel: "Use the app in English" },
  { value: "fr", label: "Français", sublabel: "Utiliser l'app en français" },
];

export function LanguageRow() {
  const t = useTranslations("Profile.setup");
  const current = useLocale() as Locale;
  const pathname = usePathname(); // locale-less path, e.g. "/profile"
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Locale>(current);
  const [pending, startTransition] = useTransition();

  const currentLabel = CARDS.find((c) => c.value === current)?.label ?? "";

  const confirm = () => {
    if (draft === current) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await updateLocale(draft);
      // Hard navigation to the new locale route: switches the URL locale AND
      // reloads so the whole app re-renders in the chosen language.
      window.location.assign(`/${draft}${pathname}`);
    });
  };

  return (
    <CenteredModal
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(current);
        setOpen(o);
      }}
      trigger={
        <SettingsRow
          label={t("languageLabel")}
          value={<span lang={current}>{currentLabel}</span>}
        />
      }
      title={t("languageTitle")}
      description={t("languageSubtitle")}
      footer={
        <>
          <ModalClose asChild>
            <Cta variant="ink">{t("cancel")}</Cta>
          </ModalClose>
          <Cta onClick={confirm} disabled={pending}>
            {pending ? t("saving") : t("languageConfirm")}
          </Cta>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-1">
        <div className="flex flex-col gap-2">
          {CARDS.map((c) => (
            <LangCard
              key={c.value}
              lang={c.value}
              label={c.label}
              sublabel={c.sublabel}
              selected={draft === c.value}
              onClick={() => setDraft(c.value)}
            />
          ))}
        </div>
        {/* Amber-edged note: amber is a SHAPE here (left edge), text stays ink. */}
        <p className="rounded-md border-l-2 border-accent bg-surface px-3 py-2 text-helper text-muted">
          {t("languageNote")}
        </p>
      </div>
    </CenteredModal>
  );
}
