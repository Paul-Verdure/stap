import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { ChallengeCard } from "@/components/challenge/challenge-card";
import { ValidateForm } from "@/components/challenge/validate-form";
import { TopBar } from "@/components/layout/top-bar";
import { getTodayChallenge, getUserProfile } from "@/lib/challenge";

// Validation main screen ("Tell me") — focus mode, no bottom nav. The recap is
// rendered here (server) and handed to the client form, which owns the feeling
// selection, optional story and heard words. Persistence + confirmation land
// in G5.5; the no-chance path in G5.6.
export default async function ValidatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Validate");
  const nav = await getTranslations("Nav");
  const prep = await getTranslations("Prepare");
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

  const recap = (
    <ChallengeCard
      eyebrow={prep("recapEyebrow")}
      level={phrase.level}
      context={contextName}
      nl={phrase.textNl}
      translation={meaning}
    />
  );

  return (
    <>
      <TopBar title={t("title")} backHref="/today" backLabel={nav("back")} />
      <ValidateForm recap={recap} />
    </>
  );
}
