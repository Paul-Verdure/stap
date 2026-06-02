import { setRequestLocale } from "next-intl/server";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

// Public new-user flow (whitelisted in middleware): it starts pre-auth at the
// language screen and only signs the user in at the end (collect-then-sign-up).
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OnboardingFlow />;
}
