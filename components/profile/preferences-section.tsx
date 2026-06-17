"use client";

import { useId, useMemo, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { useSlotLabel } from "@/components/onboarding/fields";
import { useTheme } from "@/components/system/theme-provider";
import { RadioGroup, RadioRow } from "@/components/ui/radio-group";
import { Toggle } from "@/components/ui/toggle";
import { SectionRule } from "@/components/ui/typography";
import {
  getPreferencesRaw,
  parsePreferences,
  setPreference,
  subscribeToPreferences,
} from "@/lib/preferences";
import type { ThemePreference } from "@/lib/theme";

/* ===========================================================================
   PreferencesSection (G8, step 4) — the two client toggles (Notifications,
   Sound & audio) persisted in localStorage, plus the dark-mode picker wired
   to useTheme (already client-side, survives reload). The toggle persistence
   is accepted debt (no DB column); see lib/preferences.ts.
=========================================================================== */

const CELL = "border-structural rounded-md bg-surface px-4 py-3";

export function PreferencesSection({
  reminderTime,
}: {
  reminderTime: string | null;
}) {
  const t = useTranslations("Profile.preferences");
  const slotLabel = useSlotLabel();
  const themeLabelId = useId();

  // The toggles live in localStorage; read them as an external store so the
  // switch reflects the stored value after hydration (server snapshot = "{}").
  const raw = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesRaw,
    () => "{}",
  );
  const prefs = useMemo(() => parsePreferences(raw), [raw]);

  const { preference, setPreference: setThemePreference } = useTheme();

  const notifDesc = reminderTime
    ? t("notificationsDescTime", { time: slotLabel(reminderTime) })
    : t("notificationsDesc");

  const themeOptions: { value: ThemePreference; key: string }[] = [
    { value: "system", key: "system" },
    { value: "dark", key: "dark" },
    { value: "light", key: "light" },
  ];

  return (
    <section className="flex flex-col gap-3">
      <SectionRule>{t("title")}</SectionRule>

      <div className={CELL}>
        <Toggle
          label={t("notifications")}
          description={notifDesc}
          checked={prefs.notifications}
          onCheckedChange={(v) => setPreference("notifications", v)}
        />
      </div>

      <div className={CELL}>
        <Toggle
          label={t("sound")}
          description={t("soundDesc")}
          checked={prefs.sound}
          onCheckedChange={(v) => setPreference("sound", v)}
        />
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <p id={themeLabelId} className="text-helper text-muted">
          {t("theme")}
        </p>
        <RadioGroup
          aria-labelledby={themeLabelId}
          value={preference}
          onValueChange={(v) => setThemePreference(v as ThemePreference)}
        >
          {themeOptions.map((o) => (
            <RadioRow
              key={o.value}
              value={o.value}
              label={t(`themeOptions.${o.key}`)}
            />
          ))}
        </RadioGroup>
      </div>
    </section>
  );
}
