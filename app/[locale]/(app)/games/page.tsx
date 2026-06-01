import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/layout/top-bar";
import { Helper } from "@/components/ui/typography";

// Placeholder — the games hub, mechanics and locked state are built in G7.
export default async function GamesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Games");

  return (
    <>
      <TopBar title={t("title")} />
      <main id="main-content" className="flex-1 px-5 pb-5">
        <Helper>{t("placeholder")}</Helper>
      </main>
    </>
  );
}
