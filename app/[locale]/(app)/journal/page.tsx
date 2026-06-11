import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { JournalEmpty } from "@/components/journal/journal-empty";
import { JournalEntryCard } from "@/components/journal/journal-entry-card";
import { JournalFiltersSheet } from "@/components/journal/journal-filters-sheet";
import { JournalQuickFilters } from "@/components/journal/journal-quick-filters";
import { TopBar } from "@/components/layout/top-bar";
import { SecondaryLink } from "@/components/ui/button";
import { Greeting, Helper, SectionRule } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { getUserProfile } from "@/lib/challenge";
import {
  countContexts,
  filterEntries,
  getJournalEntries,
  getUserContextOptions,
  groupEntries,
  toJournalFacet,
  type JournalGroup,
} from "@/lib/journal";
import { journalFiltersQuery, parseJournalFilters } from "@/lib/journal-filters";

// The journal — grouped reverse-chronological memory notebook. Server-rendered
// from searchParams (pagination now, filters in later steps) so the list stays
// an RSC and every state is a shareable URL.
const PAGE_SIZE = 20;

export default async function JournalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Journal");
  const format = await getFormatter();

  const profile = await getUserProfile();
  if (!profile) {
    // The (app) layout already gates non-onboarded users; this is defensive.
    redirect(`/${locale}/onboarding`);
  }

  const sp = await searchParams;
  const rawLimit = Number(typeof sp.limit === "string" ? sp.limit : NaN);
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 500)
      : PAGE_SIZE;

  const uiLocale = locale === "fr" ? "fr" : "en";
  const filters = parseJournalFilters(sp);
  const [entries, contextOptions] = await Promise.all([
    getJournalEntries(profile, uiLocale),
    getUserContextOptions(profile, uiLocale),
  ]);
  const filtered = filterEntries(entries, filters);
  const visible = filtered.slice(0, limit);
  const groups = groupEntries(visible);
  const hasMore = filtered.length > visible.length;

  const groupLabel = (group: JournalGroup) =>
    group.kind === "month"
      ? format.dateTime(group.monthDate!, "month")
      : t(
          group.kind === "thisWeek"
            ? "groupThisWeek"
            : group.kind === "lastWeek"
              ? "groupLastWeek"
              : "groupThisMonth",
        );

  return (
    <>
      <TopBar
        title={t("title")}
        right={
          <JournalFiltersSheet
            filters={filters}
            contexts={contextOptions}
            facets={entries.map(toJournalFacet)}
            disabled={entries.length === 0}
          />
        }
      />
      <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 pb-5">
        {entries.length === 0 ? (
          // Truly empty (no entry ever) — the branded invitation.
          <JournalEmpty />
        ) : (
          <>
            <Greeting
              as="h2"
              sub={
                <span aria-live="polite">
                  {t("counter", {
                    attempts: filtered.length,
                    contexts: countContexts(filtered),
                  })}
                </span>
              }
            >
              {t("intro")}
            </Greeting>

            <JournalQuickFilters filters={filters} />

            {filtered.length === 0 ? (
              // Entries exist but the active filters match none of them.
              <div className="flex flex-col items-start gap-3">
                <Helper>{t("filteredEmpty")}</Helper>
                <SecondaryLink asChild>
                  <Link href="/journal">{t("clearFilters")}</Link>
                </SecondaryLink>
              </div>
            ) : (
              groups.map((group) => (
                <section key={group.key} className="flex flex-col gap-3">
                  <SectionRule>{groupLabel(group)}</SectionRule>
                  <ul className="flex list-none flex-col gap-3 p-0">
                    {group.entries.map((entry) => (
                      <li key={entry.id}>
                        <JournalEntryCard entry={entry} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}

            {hasMore ? (
              <SecondaryLink asChild className="self-center">
                <Link
                  href={{
                    pathname: "/journal",
                    query: {
                      ...journalFiltersQuery(filters),
                      limit: limit + PAGE_SIZE,
                    },
                  }}
                  scroll={false}
                >
                  {t("loadMore")}
                </Link>
              </SecondaryLink>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
