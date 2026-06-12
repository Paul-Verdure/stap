import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/layout/top-bar";
import { Helper } from "@/components/ui/typography";

// Minimal stub — the weekly vocabulary review is designed in a later phase.
// G7 only guarantees the hub / locked-state links land somewhere honest.
export default async function GamesReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Games");

  return (
    <>
      <TopBar
        title={t("review.title")}
        backHref="/games"
        backLabel={t("review.back")}
      />
      <main id="main-content" className="flex-1 px-5 pb-5">
        <Helper>{t("review.body")}</Helper>
      </main>
    </>
  );
}
