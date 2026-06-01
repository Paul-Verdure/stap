import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

// Catch-all for unmatched paths under a valid locale. Defined routes always
// win over a catch-all, so this only fires for genuinely unknown URLs, which
// it turns into a real 404 (rendered by [locale]/not-found.tsx).
export default async function CatchAll({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
