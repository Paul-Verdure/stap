import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/layout/top-bar";
import { Helper } from "@/components/ui/typography";

// Placeholder legal pages (terms / privacy / notice). Public — they live
// outside the (app) auth gate so anyone can read them. The real copy is a
// content task; G8 only needs the footer links to resolve.
const DOCS = ["terms", "privacy", "notice"] as const;
type Doc = (typeof DOCS)[number];

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}) {
  const { locale, doc } = await params;
  setRequestLocale(locale);
  if (!DOCS.includes(doc as Doc)) notFound();

  const t = await getTranslations("Legal");

  return (
    <>
      <TopBar title={t(`${doc as Doc}.title`)} backHref="/profile" backLabel={t("back")} />
      <main id="main-content" className="flex flex-1 flex-col gap-4 px-5 pb-8">
        <Helper>{t("placeholder")}</Helper>
      </main>
    </>
  );
}
