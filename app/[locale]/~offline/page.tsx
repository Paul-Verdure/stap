import { getTranslations, setRequestLocale } from "next-intl/server";

import { Eyebrow, Question } from "@/components/ui/typography";

// Offline fallback page. Precached and served by the service worker when a
// document navigation fails with no network. The SW points at the default
// locale (/en/~offline). Scaffolding placeholder.
export default async function Offline({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Offline");

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-5">
      <div className="border-structural max-w-md rounded-lg bg-surface p-5 text-center">
        {/* "Stap" brand — muted eyebrow (amber is a shape, not text, on beige). */}
        <Eyebrow>{t("kicker")}</Eyebrow>
        <Question className="mt-4">{t("title")}</Question>
        <p className="mt-5 text-body text-muted">{t("body")}</p>
      </div>
    </main>
  );
}
