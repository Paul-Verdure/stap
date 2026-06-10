import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { TopBar } from "@/components/layout/top-bar";
import { DateLine, Helper, Nl, Question } from "@/components/ui/typography";
import { getCurrentUser } from "@/lib/auth/user";
import { isoDate } from "@/lib/date";
import { db } from "@/lib/db";

// Journal entry detail — intentionally a STUB (the detail screen is not
// designed yet). It only proves the navigation contract from the list and
// keeps the data access scoped to the owner.
export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Journal");
  const format = await getFormatter();

  const user = await getCurrentUser();
  if (!user) notFound();

  // Scoped to the owner — Prisma bypasses RLS, so the userId clause is the
  // access control here.
  const entry = await db.journalEntry.findFirst({
    where: { id, userId: user.id },
    include: { challenge: { include: { phrase: true } } },
  });
  if (!entry) notFound();

  return (
    <>
      <TopBar
        title={t("title")}
        backHref="/journal"
        backLabel={t("backToJournal")}
      />
      <main id="main-content" className="flex flex-1 flex-col gap-4 px-5 pb-5">
        <DateLine dateTime={isoDate(entry.challenge.date)}>
          {format.dateTime(entry.challenge.date, "full")}
        </DateLine>
        <Question as="h2">
          <Nl>{entry.challenge.phrase.textNl}</Nl>
        </Question>
        {entry.body ? <p className="text-body">{entry.body}</p> : null}
        <Helper>{t("detailPlaceholder")}</Helper>
      </main>
    </>
  );
}
