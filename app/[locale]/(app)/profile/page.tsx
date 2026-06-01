import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/layout/top-bar";
import { LocaleSwitcher } from "@/components/system/locale-switcher";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { DateLine, Eyebrow, Helper } from "@/components/ui/typography";

// Placeholder — the full profile (identity, setup, account, modals) is built
// in G8, which also absorbs the temporary theme/locale switchers below. The
// sample date proves the canonical formatter reformats per locale (live).
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");
  const format = await getFormatter();

  const now = new Date();

  return (
    <>
      <TopBar title={t("title")} />
      <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 pb-5">
        <Helper>{t("placeholder")}</Helper>

        <section className="flex flex-col gap-2">
          <Eyebrow>{t("interface")}</Eyebrow>
          <LocaleSwitcher />
        </section>

        <section className="flex flex-col gap-2">
          <Eyebrow>{t("theme")}</Eyebrow>
          <ThemeToggle />
        </section>

        <section className="flex flex-col gap-1">
          <Eyebrow>{t("sampleDate")}</Eyebrow>
          <DateLine dateTime={now.toISOString()}>
            {format.dateTime(now, "full")} · {format.dateTime(now, "time")}
          </DateLine>
        </section>
      </main>
    </>
  );
}
