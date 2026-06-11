"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { FEELING_MESSAGE_KEY } from "@/components/journal/feeling-keys";
import { Cta, IconButton, SecondaryLink } from "@/components/ui/button";
import { CheckboxRow } from "@/components/ui/checkbox-row";
import { Chip } from "@/components/ui/chip";
import { FiltersIcon } from "@/components/ui/icons";
import { BottomSheet } from "@/components/ui/modal";
import { RadioGroup, RadioRow } from "@/components/ui/radio-group";
import { SectionRule } from "@/components/ui/typography";
import { useRouter } from "@/i18n/navigation";
import {
  EMPTY_JOURNAL_FILTERS,
  JOURNAL_FEELINGS,
  journalFiltersQuery,
  matchesJournalFilters,
  type JournalContent,
  type JournalFacet,
  type JournalFilters,
  type JournalPeriod,
} from "@/lib/journal-filters";

/* ===========================================================================
   JournalFiltersSheet (G6) — the advanced filters behind the TopBar icon.
   ---------------------------------------------------------------------------
   A BottomSheet over a local DRAFT of the URL filter state: edits stay in the
   sheet until "Apply (N)" pushes them to searchParams (the list re-renders on
   the server). N is computed live by running the shared predicate over the
   serializable facets of all entries. Reset clears the draft only. Radix
   handles ESC/backdrop dismissal and the focus trap.

   When the journal is truly empty there is nothing to filter: render only a
   dimmed (but still labelled) disabled trigger.
=========================================================================== */

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export function JournalFiltersSheet({
  filters,
  contexts,
  facets,
  disabled = false,
}: {
  /** The active (URL) filter state — the draft re-seeds from it on open. */
  filters: JournalFilters;
  /** The user's own life contexts, localized: the context chip options. */
  contexts: { slug: string; name: string }[];
  /** Facets of ALL entries (unfiltered) — drives the live Apply count. */
  facets: JournalFacet[];
  disabled?: boolean;
}) {
  const t = useTranslations("Journal");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<JournalFilters>(filters);

  if (disabled) {
    return (
      <IconButton label={t("filtersLabel")} disabled className="opacity-35">
        <FiltersIcon className="h-5 w-5" />
      </IconButton>
    );
  }

  const resultCount = facets.filter((f) =>
    matchesJournalFilters(f, draft),
  ).length;

  const apply = () => {
    router.replace(
      { pathname: "/journal", query: journalFiltersQuery(draft) },
      { scroll: false },
    );
    setOpen(false);
  };

  return (
    <BottomSheet
      trigger={
        <IconButton label={t("filtersLabel")}>
          <FiltersIcon className="h-5 w-5" />
        </IconButton>
      }
      title={t("sheetTitle")}
      description={t("sheetDescription")}
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(filters); // re-seed the draft from the URL state
        setOpen(next);
      }}
      footer={
        <>
          <SecondaryLink
            className="text-muted"
            onClick={() => setDraft(EMPTY_JOURNAL_FILTERS)}
          >
            {t("reset")}
          </SecondaryLink>
          <Cta onClick={apply}>{t("applyCount", { count: resultCount })}</Cta>
        </>
      }
    >
      <div className="flex flex-col gap-6 py-2">
        <section className="flex flex-col gap-3">
          <SectionRule>{t("sectionFeeling")}</SectionRule>
          <div
            role="group"
            aria-label={t("sectionFeeling")}
            className="flex flex-wrap gap-2"
          >
            {JOURNAL_FEELINGS.map((feeling) => (
              <Chip
                key={feeling}
                selected={draft.feelings.includes(feeling)}
                onClick={() =>
                  setDraft((d) => ({ ...d, feelings: toggle(d.feelings, feeling) }))
                }
              >
                {t(FEELING_MESSAGE_KEY[feeling])}
              </Chip>
            ))}
          </div>
        </section>

        {contexts.length > 0 ? (
          <section className="flex flex-col gap-3">
            <SectionRule>{t("sectionContext")}</SectionRule>
            <div
              role="group"
              aria-label={t("sectionContext")}
              className="flex flex-wrap gap-2"
            >
              {contexts.map((ctx) => (
                <Chip
                  key={ctx.slug}
                  selected={draft.contexts.includes(ctx.slug)}
                  onClick={() =>
                    setDraft((d) => ({ ...d, contexts: toggle(d.contexts, ctx.slug) }))
                  }
                >
                  {ctx.name}
                </Chip>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <SectionRule>{t("sectionPeriod")}</SectionRule>
          <RadioGroup
            aria-label={t("sectionPeriod")}
            value={draft.period}
            onValueChange={(value) =>
              setDraft((d) => ({ ...d, period: value as JournalPeriod }))
            }
          >
            <RadioRow value="all" label={t("periodAll")} />
            <RadioRow value="week" label={t("groupThisWeek")} />
            <RadioRow value="month" label={t("groupThisMonth")} />
          </RadioGroup>
        </section>

        <section className="flex flex-col gap-3">
          <SectionRule>{t("sectionContent")}</SectionRule>
          {(
            [
              ["story", "contentStory"],
              ["words", "contentWords"],
            ] as const satisfies readonly (readonly [JournalContent, string])[]
          ).map(([value, key]) => (
            <CheckboxRow
              key={value}
              label={t(key)}
              checked={draft.content.includes(value)}
              onChange={() =>
                setDraft((d) => ({ ...d, content: toggle(d.content, value) }))
              }
            />
          ))}
        </section>
      </div>
    </BottomSheet>
  );
}
