"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useSlotLabel } from "@/components/onboarding/fields";
import { useTheme } from "@/components/system/theme-provider";
import { RadioGroup, RadioRow } from "@/components/ui/radio-group";
import { Toggle } from "@/components/ui/toggle";
import { SectionRule } from "@/components/ui/typography";
import { clearLegacyPreferences, readLegacyPreference } from "@/lib/preferences";
import { updatePreference } from "@/lib/preferences-actions";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/push-actions";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import type { ThemePreference } from "@/lib/theme";

/* ===========================================================================
   PreferencesSection (G8 → DB-backed in G9) — the two toggles (Notifications,
   Sound & audio) now persist in User columns via a server action, plus the
   dark-mode picker wired to useTheme (client-side, survives reload). Server
   values seed the toggles; a one-time effect backfills any value a client had
   stored under the old G8 localStorage key, then drops the key.
=========================================================================== */

const CELL = "border-structural rounded-md bg-surface px-4 py-3";

export function PreferencesSection({
  reminderTime,
  notificationsEnabled,
  soundEnabled,
}: {
  reminderTime: string | null;
  notificationsEnabled: boolean | null;
  soundEnabled: boolean | null;
}) {
  const t = useTranslations("Profile.preferences");
  const slotLabel = useSlotLabel();
  const themeLabelId = useId();

  // Optimistic local state; the server action revalidates the page, so a
  // persisted value (incl. a backfill) flows back as the prop and is reconciled
  // below — React's "adjust state on prop change" pattern. Notifications gate
  // real Web Push, so they are opt-IN (default off until the user grants
  // permission); Sound is opt-out (default on).
  const [notifications, setNotifications] = useState(
    notificationsEnabled ?? false,
  );
  const [prevNotif, setPrevNotif] = useState(notificationsEnabled);
  if (notificationsEnabled !== prevNotif) {
    setPrevNotif(notificationsEnabled);
    setNotifications(notificationsEnabled ?? false);
  }

  const [sound, setSound] = useState(soundEnabled ?? true);
  const [prevSound, setPrevSound] = useState(soundEnabled);
  if (soundEnabled !== prevSound) {
    setPrevSound(soundEnabled);
    setSound(soundEnabled ?? true);
  }

  // One-time backfill: migrate any value stored under the legacy localStorage
  // key into the DB columns, then drop the key. The action revalidates, so the
  // migrated value returns as a prop (no setState in the effect). Runs once.
  const backfilled = useRef(false);
  useEffect(() => {
    if (backfilled.current) return;
    backfilled.current = true;

    if (notificationsEnabled === null) {
      const legacy = readLegacyPreference("notifications");
      if (legacy !== null) void updatePreference("notifications", legacy);
    }
    if (soundEnabled === null) {
      const legacy = readLegacyPreference("sound");
      if (legacy !== null) void updatePreference("sound", legacy);
    }
    clearLegacyPreferences();
  }, [notificationsEnabled, soundEnabled]);

  const { preference, setPreference: setThemePreference } = useTheme();

  // Notifications gate Web Push: turning it on requests permission and creates
  // a subscription for this device; off removes it. If the browser can't
  // subscribe (unsupported or permission denied), revert and persist off.
  async function onNotifications(value: boolean) {
    setNotifications(value); // optimistic
    if (value) {
      const sub = await subscribeToPush();
      if (!sub) {
        setNotifications(false);
        void updatePreference("notifications", false);
        return;
      }
      await savePushSubscription(sub);
      void updatePreference("notifications", true);
    } else {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await removePushSubscription(endpoint);
      void updatePreference("notifications", false);
    }
  }
  function onSound(value: boolean) {
    setSound(value);
    void updatePreference("sound", value);
  }

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
          checked={notifications}
          onCheckedChange={(v) => void onNotifications(v)}
        />
      </div>

      <div className={CELL}>
        <Toggle
          label={t("sound")}
          description={t("soundDesc")}
          checked={sound}
          onCheckedChange={onSound}
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
