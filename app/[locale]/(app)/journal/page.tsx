import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/layout/top-bar";
import { Helper } from "@/components/ui/typography";

// Placeholder — the journal list, filters and empty state are built in G6
// (the TopBar filter control lands with them).
export default async function JournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Journal");

  return (
    <>
      <TopBar title={t("title")} />
      <main id="main-content" className="flex-1 px-5 pb-5">
        <Helper>{t("placeholder")}</Helper>
      </main>
    </>
  );
}
