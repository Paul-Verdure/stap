import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/layout/top-bar";
import { AccountSection } from "@/components/profile/account-section";
import { IdentityCard } from "@/components/profile/identity-card";
import { JourneyCards } from "@/components/profile/journey-cards";
import { LegalFooter } from "@/components/profile/legal-footer";
import { PreferencesSection } from "@/components/profile/preferences-section";
import { SetupSection } from "@/components/profile/setup-section";
import { IconButton } from "@/components/ui/button";
import { SettingsIcon } from "@/components/ui/icons";
import { SectionRule } from "@/components/ui/typography";
import {
  daysSince,
  getJourneyPreview,
  getLifeContextOptions,
  getPreferences,
  getProfileIdentity,
  getSetupData,
} from "@/lib/profile";

// The Profile tab (G8): identity hero, journey stubs, editable setup,
// preferences, account management, and the two modals. Built step by step.
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");

  // The (app) layout already gates on a session + onboarding; a missing
  // identity here would be an inconsistent state, so bounce to onboarding.
  const identity = await getProfileIdentity();
  if (!identity) redirect(`/${locale}/onboarding`);

  const journey = await getJourneyPreview();
  const setup = await getSetupData();
  const lifeContexts = await getLifeContextOptions(locale);
  const preferences = await getPreferences();

  return (
    <>
      <TopBar
        title={t("title")}
        right={
          // The gear jumps to the settings region lower on the page (the
          // "#setup" anchor lands in step 3); it is a real, labelled link.
          <IconButton asChild label={t("settingsLabel")}>
            <a href="#setup">
              <SettingsIcon className="h-5 w-5" />
            </a>
          </IconButton>
        }
      />
      <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 pb-8">
        <IdentityCard
          name={identity.displayName}
          level={identity.level}
          uiLocale={identity.uiLocale}
          days={daysSince(identity.createdAt)}
        />

        {journey ? (
          <section className="flex flex-col gap-3">
            <SectionRule>{t("journey.title")}</SectionRule>
            <JourneyCards
              weekRhythm={journey.weekRhythm}
              seasonSteps={journey.seasonSteps}
              contextCount={journey.contextCount}
            />
          </section>
        ) : null}

        {setup ? (
          <SetupSection
            level={setup.level}
            contextSlugs={setup.contextSlugs}
            frequency={setup.frequency}
            reminderTime={setup.reminderTime}
            options={lifeContexts}
          />
        ) : null}

        <PreferencesSection
          reminderTime={setup?.reminderTime ?? null}
          notificationsEnabled={preferences?.notificationsEnabled ?? null}
          soundEnabled={preferences?.soundEnabled ?? null}
        />

        <AccountSection email={identity.email} />

        <LegalFooter />
      </main>
    </>
  );
}
