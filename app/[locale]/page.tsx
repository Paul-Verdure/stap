import { getTranslations, setRequestLocale } from "next-intl/server";

import { Eyebrow, Nl, Question } from "@/components/ui/typography";

// Scaffolding placeholder — exercises the design system primitives and i18n.
// Replaced by the real (public) entry in G2/G3.
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-5">
      <div className="border-structural max-w-md rounded-lg bg-surface p-5">
        {/* "Stap" is the brand; muted eyebrow (amber text would fail AA on
            beige — amber is a shape, not text, on light surfaces). */}
        <Eyebrow>{t("kicker")}</Eyebrow>
        {/* "Leer Nederlands" is Dutch — invariant, carries lang="nl". */}
        <Question className="mt-4">
          <Nl>{t("title")}</Nl>
        </Question>
        <p className="mt-5 text-body text-muted">{t("subtitle")}</p>
      </div>
    </main>
  );
}
