import { getTranslations, setRequestLocale } from "next-intl/server";

// Scaffolding placeholder — exercises the design system tokens and i18n for
// visual validation. To be replaced by the real UI in a later step.
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
        <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent">
          {t("kicker")}
        </p>
        <h1 className="mt-4 font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.5px]">
          {t("title")}
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          {t("subtitle")}
        </p>
      </div>
    </main>
  );
}
