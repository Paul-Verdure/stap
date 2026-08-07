import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth/user";
import { TopBar } from "@/components/layout/top-bar";
import { LegalDocument } from "./legal-document";

// Terms / privacy / legal notice. Public — outside the (app) auth gate and
// whitelisted in PUBLIC_PATHS, because a consent document nobody can read
// without an account is worth nothing.
//
// The page reads the session, so it renders on demand instead of being
// prerendered. That is the deliberate cost of a back control that works for
// both audiences: a signed-in reader arrives from the profile footer and
// expects to return there, while someone following a store or email link has
// no profile to go back to. These pages hold no data and are visited rarely,
// so the render cost is noise next to sending a logged-out reader to a login
// screen they did not ask for.
const DOCS = ["terms", "privacy", "notice"] as const;
type Doc = (typeof DOCS)[number];

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}) {
  const { locale, doc } = await params;
  setRequestLocale(locale);
  if (!DOCS.includes(doc as Doc)) notFound();

  const t = await getTranslations("Legal");
  const user = await getCurrentUser();

  return (
    <>
      <TopBar
        title={t(`${doc as Doc}.title`)}
        backHref={user ? "/profile" : "/"}
        backLabel={user ? t("backToProfile") : t("backToStart")}
      />
      <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 pb-10">
        <LegalDocument doc={doc as Doc} />
      </main>
    </>
  );
}
