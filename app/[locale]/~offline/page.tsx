import { getTranslations, setRequestLocale } from "next-intl/server";

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
        <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent">
          {t("kicker")}
        </p>
        <h1 className="mt-4 font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.5px]">
          {t("title")}
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          {t("body")}
        </p>
      </div>
    </main>
  );
}
