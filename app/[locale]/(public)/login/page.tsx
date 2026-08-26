import { Suspense } from "react";

import { getTranslations, setRequestLocale } from "next-intl/server";

import { DeletedNotice } from "./deleted-notice";
import { LoginForm } from "./login-form";
import { Link } from "@/i18n/navigation";
import { SecondaryLink } from "@/components/ui/button";
import { Eyebrow, Question } from "@/components/ui/typography";

// Public reconnect entry — the "I already have an account" path. Emails a
// sign-in code (plus the magic link handled by /auth/confirm) to a known
// address; LoginForm owns both steps. Real login flow for returning users.
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Login");

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-5">
      <div className="border-structural flex w-full max-w-md flex-col gap-5 rounded-lg bg-surface p-6">
        <Eyebrow>Stap</Eyebrow>
        <Question>{t("title")}</Question>
        {/* Suspense keeps the surrounding shell prerendered — the notice
            reads the query string, so only it renders on the client. */}
        <Suspense fallback={null}>
          <DeletedNotice />
        </Suspense>
        {/* The subtitle lives inside the form: it instructs step 1 only, and
            would read as a stale instruction once the code step is up. */}
        <LoginForm />
        <SecondaryLink asChild className="self-center">
          <Link href="/">{t("back")}</Link>
        </SecondaryLink>
      </div>
    </main>
  );
}
