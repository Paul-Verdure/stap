import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Cta } from "@/components/ui/button";
import { Eyebrow, Helper, Question } from "@/components/ui/typography";

// Branded 404. Reached via the [locale]/[...rest] catch-all (unmatched paths)
// and any notFound() call within the locale segment. Rendered dynamically, so
// next-intl resolves the locale from the request — no params needed.
export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-5">
      <div className="border-structural flex w-full max-w-md flex-col gap-4 rounded-lg bg-surface p-6">
        <Eyebrow>404</Eyebrow>
        <Question>{t("title")}</Question>
        <Helper>{t("body")}</Helper>
        <Cta asChild className="mt-1 self-start">
          <Link href="/">{t("home")}</Link>
        </Cta>
      </div>
    </main>
  );
}
