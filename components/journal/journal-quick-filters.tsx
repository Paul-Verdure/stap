"use client";

import { useTranslations } from "next-intl";

import { FEELING_MESSAGE_KEY } from "@/components/journal/feeling-keys";
import { Chip } from "@/components/ui/chip";
import { useRouter } from "@/i18n/navigation";
import {
  JOURNAL_FEELINGS,
  journalFiltersQuery,
  type JournalFeeling,
  type JournalFilters,
} from "@/lib/journal-filters";

/* ===========================================================================
   JournalQuickFilters (G6) — the chips row above the list.
   ---------------------------------------------------------------------------
   A thin client shim over the URL: chips toggle the feeling set and push the
   new searchParams (replace, no scroll), so filtering stays server-rendered
   and shareable. Multi-select chips per the selection language (amber check);
   "All" clears the set. Changing a filter intentionally resets pagination
   (the limit param is dropped).
=========================================================================== */

export function JournalQuickFilters({ filters }: { filters: JournalFilters }) {
  const t = useTranslations("Journal");
  const router = useRouter();

  const apply = (next: JournalFilters) =>
    router.replace(
      { pathname: "/journal", query: journalFiltersQuery(next) },
      { scroll: false },
    );

  const toggle = (feeling: JournalFeeling) =>
    apply({
      ...filters,
      feelings: filters.feelings.includes(feeling)
        ? filters.feelings.filter((f) => f !== feeling)
        : [...filters.feelings, feeling],
    });

  return (
    <div
      role="group"
      aria-label={t("quickFiltersLabel")}
      className="flex flex-wrap gap-2"
    >
      <Chip
        selected={filters.feelings.length === 0}
        onClick={() => apply({ ...filters, feelings: [] })}
      >
        {t("filterAll")}
      </Chip>
      {JOURNAL_FEELINGS.map((feeling) => (
        <Chip
          key={feeling}
          selected={filters.feelings.includes(feeling)}
          onClick={() => toggle(feeling)}
        >
          {t(FEELING_MESSAGE_KEY[feeling])}
        </Chip>
      ))}
    </div>
  );
}
