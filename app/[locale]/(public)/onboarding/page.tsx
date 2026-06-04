import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getCurrentUser } from "@/lib/auth/user";
import { db } from "@/lib/db";

// Public new-user flow (whitelisted in middleware): it starts pre-auth at the
// language screen and only signs the user in at the end (collect-then-sign-up).
// An already-onboarded user has no business here -> straight to /today. Life
// contexts come from the seeded catalog (single source of truth), labels
// localized here.
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: { onboardedAt: true },
    });
    if (profile?.onboardedAt) {
      redirect(`/${locale}/today`);
    }
  }

  const rows = await db.lifeContext.findMany({
    orderBy: { slug: "asc" },
    select: { slug: true, nameEn: true, nameFr: true },
  });
  const lifeContexts = rows.map((r) => ({
    slug: r.slug,
    name: locale === "fr" ? r.nameFr : r.nameEn,
  }));

  return (
    <OnboardingFlow lifeContexts={lifeContexts} isAuthenticated={Boolean(user)} />
  );
}
