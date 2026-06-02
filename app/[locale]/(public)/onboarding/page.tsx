import { setRequestLocale } from "next-intl/server";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { db } from "@/lib/db";

// Public new-user flow (whitelisted in middleware): it starts pre-auth at the
// language screen and only signs the user in at the end (collect-then-sign-up).
// Life contexts come from the seeded catalog (single source of truth) so the
// chips stay in sync with challenge selection (G4); labels are localized here.
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const rows = await db.lifeContext.findMany({
    orderBy: { slug: "asc" },
    select: { slug: true, nameEn: true, nameFr: true },
  });
  const lifeContexts = rows.map((r) => ({
    slug: r.slug,
    name: locale === "fr" ? r.nameFr : r.nameEn,
  }));

  return <OnboardingFlow lifeContexts={lifeContexts} />;
}
