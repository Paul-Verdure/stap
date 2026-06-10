import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/layout/top-bar";
import { IconButton, SecondaryLink } from "@/components/ui/button";
import { FiltersIcon } from "@/components/ui/icons";
import { RhythmUnit } from "@/components/ui/rhythm";
import { DateLine, Greeting, Nl, SectionRule } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { getUserProfile } from "@/lib/challenge";
import { isoDate } from "@/lib/date";
import {
  countContexts,
  getJournalEntries,
  groupEntries,
  type JournalGroup,
} from "@/lib/journal";

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

  const entries = await getJournalEntries(profile, locale === "fr" ? "fr" : "en");
  const visible = entries.slice(0, limit);
  const groups = groupEntries(visible);
  const hasMore = entries.length > visible.length;

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
          <IconButton label={t("filtersLabel")}>
            <FiltersIcon className="h-5 w-5" />
          </IconButton>
        }
      />
      <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 pb-5">
        <Greeting
          as="h2"
          sub={
            <span aria-live="polite">
              {t("counter", {
                attempts: entries.length,
                contexts: countContexts(entries),
              })}
            </span>
          }
        >
          {t("intro")}
        </Greeting>

        {groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-3">
            <SectionRule>{groupLabel(group)}</SectionRule>
            <ul className="flex list-none flex-col gap-3 p-0">
              {group.entries.map((entry) => (
                <li key={entry.id}>
                  <article className="flex items-center justify-between gap-3 rounded-md border-structural bg-surface px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <DateLine dateTime={isoDate(entry.date)}>
                        {format.dateTime(entry.date, "short")}
                      </DateLine>
                      <span className="font-display text-body font-semibold">
                        <Nl>{entry.textNl}</Nl>
                      </span>
                    </div>
                    <RhythmUnit state={entry.feeling} size="lg" />
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {hasMore ? (
          <SecondaryLink asChild className="self-center">
            <Link
              href={{ pathname: "/journal", query: { limit: limit + PAGE_SIZE } }}
              scroll={false}
            >
              {t("loadMore")}
            </Link>
          </SecondaryLink>
        ) : null}
      </main>
    </>
  );
}
