import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Cta, SecondaryLink } from "@/components/ui/button";
import { Eyebrow, Helper, Nl, Question } from "@/components/ui/typography";

// Public entry (welcome). Scaffolding placeholder — the real onboarding /
// magic-link entry is built in G3 (Phase C auth). For now it exercises the
// design system and gives the shell a way into the authenticated app.
export default async function Welcome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Welcome");

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-5">
      <div className="border-structural flex w-full max-w-md flex-col gap-5 rounded-lg bg-surface p-6">
        {/* "Stap" is the brand; muted eyebrow (amber text would fail AA on
            beige — amber is a shape, not text, on light surfaces). */}
        <Eyebrow>{t("kicker")}</Eyebrow>
        {/* "Leer Nederlands" is Dutch — invariant, carries lang="nl". */}
        <Question>
          <Nl>{t("title")}</Nl>
        </Question>
        <Helper>{t("subtitle")}</Helper>
        <div className="mt-1 flex flex-col gap-3">
          <Cta asChild fullWidth>
            <Link href="/today">{t("enter")}</Link>
          </Cta>
          <SecondaryLink asChild className="self-center">
            <Link href="/today">{t("haveAccount")}</Link>
          </SecondaryLink>
        </div>
      </div>
    </main>
  );
}
