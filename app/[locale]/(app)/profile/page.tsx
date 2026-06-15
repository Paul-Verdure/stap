import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TopBar } from "@/components/layout/top-bar";
import { IdentityCard } from "@/components/profile/identity-card";
import { IconButton } from "@/components/ui/button";
import { SettingsIcon } from "@/components/ui/icons";
import { daysSince, getProfileIdentity } from "@/lib/profile";

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
      </main>
    </>
  );
}
