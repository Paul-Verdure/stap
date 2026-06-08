import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { ChallengeCard } from "@/components/challenge/challenge-card";
import { TopBar } from "@/components/layout/top-bar";
import { Cta } from "@/components/ui/button";
import { Helper, SectionHead } from "@/components/ui/typography";
import { getTodayChallenge, getUserProfile } from "@/lib/challenge";

// Preparation — single scrollable screen, sticky commitment CTA, no bottom nav
// (focus mode). G5.1 lays out the structure: a hero recap + the bilingual
// section heads. The section content + audio land in G5.2; the commit write
// lands in G5.3.
export default async function PreparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Prepare");
  const nav = await getTranslations("Nav");
  const fr = locale === "fr";

  const profile = await getUserProfile();
  if (!profile) redirect(`/${locale}/onboarding`);

  const challenge = await getTodayChallenge(profile);
  if (!challenge) redirect(`/${locale}/today`);

  const { phrase } = challenge;
  const meaning = fr ? phrase.meaningFr : phrase.meaningEn;
  const ctx = phrase.lifeContexts.find((lc) =>
    profile.contextSlugs.includes(lc.lifeContext.slug),
  )?.lifeContext;
  const contextName = ctx ? (fr ? ctx.nameFr : ctx.nameEn) : undefined;

  return (
    <>
      <TopBar title={t("title")} backHref="/today" backLabel={nav("back")} />

      <main id="main-content" className="flex-1 px-5 pb-28">
        <div className="flex flex-col gap-6">
          <ChallengeCard
            eyebrow={t("recapEyebrow")}
            level={phrase.level}
            context={contextName}
            nl={phrase.textNl}
            translation={meaning}
          />

          {/* Section skeleton (bilingual heads); content arrives in G5.2. */}
          <section>
            <SectionHead title={t("situationTitle")} nl="de situatie" />
          </section>
          <section>
            <SectionHead title={t("keywordsTitle")} nl="de sleutelwoorden" />
          </section>
          <section>
            <SectionHead title={t("sentenceTitle")} nl="de zin" />
          </section>
          <section>
            <SectionHead title={t("tipsTitle")} nl="tips" />
          </section>
        </div>
      </main>

      {/* Sticky commitment bar — a footer landmark so all content is in a
          landmark (a11y). The write lands in G5.3. */}
      <footer className="sticky bottom-0 border-t-[1.5px] border-foreground bg-background px-5 py-4">
        <Cta variant="commitment" fullWidth>
          {t("commit")}
        </Cta>
        <Helper className="mt-2 text-center">{t("commitNudge")}</Helper>
      </footer>
    </>
  );
}
