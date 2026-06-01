import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/layout/top-bar";
import { Helper } from "@/components/ui/typography";

// Placeholder — the preparation ramp is built in G5. Focus mode: no bottom nav.
export default async function PreparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Prepare");
  const nav = await getTranslations("Nav");

  return (
    <>
      <TopBar title={t("title")} backHref="/today" backLabel={nav("back")} />
      <main id="main-content" className="flex-1 px-5 pb-5">
        <Helper>{t("placeholder")}</Helper>
      </main>
    </>
  );
}
