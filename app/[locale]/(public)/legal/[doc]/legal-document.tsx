import { useFormatter, useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/i18n/routing";
import { LEGAL, legalTokens } from "@/lib/legal-config";
import { DateLine, Helper, SectionHead } from "@/components/ui/typography";

/* ===========================================================================
   LegalDocument — renders one legal document (terms / privacy / notice) from
   the message catalog.

   The documents are stored as structured sections rather than one rich-text
   blob so the markup stays semantic: a real <h2> per section, real <ul> for
   the enumerations, and no translated HTML. The page's TopBar owns the <h1>.

   Section bodies come through t.raw(), which returns the strings untouched —
   no ICU interpolation. The few publisher facts they reference are therefore
   substituted here, explicitly, from lib/legal-config.
=========================================================================== */

type Doc = "terms" | "privacy" | "notice";

type Section = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

function fill(text: string, tokens: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in tokens ? tokens[key] : match,
  );
}

export function LegalDocument({ doc }: { doc: Doc }) {
  const t = useTranslations("Legal");
  const format = useFormatter();
  const tokens = legalTokens(useLocale() as Locale);

  const sections = t.raw(`${doc}.sections`) as Section[];

  return (
    <article className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <DateLine dateTime={LEGAL.updatedAt}>
          {t("updated", {
            date: format.dateTime(new Date(LEGAL.updatedAt), {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          })}
        </DateLine>
        <p className="text-body text-foreground">
          {fill(t.raw(`${doc}.intro`) as string, tokens)}
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <SectionHead title={fill(section.heading, tokens)} />

          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="text-body text-foreground">
              {fill(paragraph, tokens)}
            </p>
          ))}

          {section.bullets ? (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body text-foreground">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{fill(bullet, tokens)}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <Helper>{t("contactLine", { email: LEGAL.contactEmail })}</Helper>
    </article>
  );
}
