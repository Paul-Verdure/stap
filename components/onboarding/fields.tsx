"use client";

import { useTranslations } from "next-intl";

import { Chip, TimeSlot } from "@/components/ui/chip";
import { RadioGroup, RadioRow } from "@/components/ui/radio-group";
import { Tag } from "@/components/ui/surface";
import { SectionRule } from "@/components/ui/typography";
import {
  FREQUENCIES,
  LEVELS,
  MAX_CONTEXTS,
  REMINDER_SLOTS,
  REMINDER_SLOT_KEYS,
  type DutchLevel,
  type Frequency,
  type ReminderSlot,
} from "@/lib/onboarding";

/* ===========================================================================
   Shared setup fields (G8) — the three answer controls factored out of the
   onboarding flow so that both onboarding (collect-then-sign-up) AND the
   Profile "My setup" editors compose the exact same markup instead of
   duplicating it. Each is controlled and presentational: the caller owns the
   value and persistence. Level/frequency labels stay in the Onboarding
   message namespace (single source of truth for the catalog wording).
=========================================================================== */

export type LifeContextOption = { slug: string; name: string };

/* Slot naming. A stored slot is a UTC hour (see REMINDER_SLOTS), so it must
   never be rendered as a clock time: doing so promised "8:00 AM" and delivered
   10:00 Dutch time in summer. Both hooks map the slot to a time-of-day word,
   which stays true across the DST hour the fixed cron cannot track.

   Two forms, because one string cannot be both a chip and part of a sentence
   in English and French at once: `label` is the standalone chip ("Morning"),
   `phrase` is the in-sentence form ("in the morning" / "le matin"). */

/** Standalone name for a slot — chips, recap rows. */
export function useSlotLabel() {
  const t = useTranslations("Onboarding.slots");
  const tt = t as unknown as (key: string) => string;
  return (slot: string) =>
    tt(`${REMINDER_SLOT_KEYS[slot as ReminderSlot] ?? "morning"}.label`);
}

/** In-sentence form for a slot — "A daily nudge in the morning." */
export function useSlotPhrase() {
  const t = useTranslations("Onboarding.slots");
  const tt = t as unknown as (key: string) => string;
  return (slot: string) =>
    tt(`${REMINDER_SLOT_KEYS[slot as ReminderSlot] ?? "morning"}.phrase`);
}

/* ---------------------------------------------------------------------------
   LevelSelect — single-select Dutch level (hero row + amber CEFR tag).
--------------------------------------------------------------------------- */
export function LevelSelect({
  value,
  onChange,
}: {
  value: DutchLevel | null;
  onChange: (level: DutchLevel) => void;
}) {
  const t = useTranslations("Onboarding");
  // next-intl types `t` to literal keys; loosen for the dynamic level lookups.
  const tt = t as unknown as (key: string) => string;
  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={(v) => onChange(v as DutchLevel)}
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
  );
}

/* ---------------------------------------------------------------------------
   ContextMultiSelect — life contexts, multi-select 1..MAX_CONTEXTS.
--------------------------------------------------------------------------- */
export function ContextMultiSelect({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
  options: LifeContextOption[];
}) {
  const t = useTranslations("Onboarding");
  const toggle = (slug: string) => {
    const has = value.includes(slug);
    if (!has && value.length >= MAX_CONTEXTS) return; // cap at MAX_CONTEXTS
    onChange(has ? value.filter((c) => c !== slug) : [...value, slug]);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map((c) => (
          <Chip
            key={c.slug}
            selected={value.includes(c.slug)}
            onClick={() => toggle(c.slug)}
          >
            {c.name}
          </Chip>
        ))}
      </div>
      <p aria-live="polite" className="text-helper text-muted">
        {t("contextsCount", { count: value.length, max: MAX_CONTEXTS })}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   FrequencyReminderSelect — cadence + reminder slot. Picking "own pace" clears
   the reminder (the rule is encapsulated here via the combined onChange so
   onboarding and Profile cannot drift).
--------------------------------------------------------------------------- */
export function FrequencyReminderSelect({
  frequency,
  reminderTime,
  onChange,
}: {
  frequency: Frequency | null;
  reminderTime: string | null;
  onChange: (next: { frequency: Frequency; reminderTime: string | null }) => void;
}) {
  const t = useTranslations("Onboarding");
  const tt = t as unknown as (key: string) => string;
  const slotLabel = useSlotLabel();
  const reminderDisabled = frequency === "OWN_PACE";

  return (
    <div className="flex flex-col gap-5">
      <RadioGroup
        value={frequency ?? ""}
        onValueChange={(v) =>
          onChange({
            frequency: v as Frequency,
            // "Own pace" has no fixed cadence: clear any reminder.
            reminderTime: v === "OWN_PACE" ? null : reminderTime,
          })
        }
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

      <div className="flex flex-col gap-2">
        <SectionRule>{t("reminderTitle")}</SectionRule>
        <div className="flex flex-wrap gap-2">
          {REMINDER_SLOTS.map((slot) => (
            <TimeSlot
              key={slot}
              selected={reminderTime === slot}
              disabled={reminderDisabled}
              onClick={() =>
                onChange({ frequency: frequency as Frequency, reminderTime: slot })
              }
            >
              {slotLabel(slot)}
            </TimeSlot>
          ))}
          <TimeSlot
            selected={!reminderDisabled && reminderTime === null}
            disabled={reminderDisabled}
            onClick={() =>
              onChange({ frequency: frequency as Frequency, reminderTime: null })
            }
          >
            {t("reminderOff")}
          </TimeSlot>
        </div>
      </div>
    </div>
  );
}
