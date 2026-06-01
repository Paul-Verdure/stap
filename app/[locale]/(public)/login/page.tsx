import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "./login-form";
import { Link } from "@/i18n/navigation";
import { SecondaryLink } from "@/components/ui/button";
import { Eyebrow, Helper, Question } from "@/components/ui/typography";

// Public reconnect entry — the "I already have an account" path. Sends a
// magic link to a known address; the link returns to /auth/callback, which
// establishes the session. Real login flow for returning users (Phase C).
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
        <Helper>{t("subtitle")}</Helper>
        <LoginForm />
        <SecondaryLink asChild className="self-center">
          <Link href="/">{t("back")}</Link>
        </SecondaryLink>
      </div>
    </main>
  );
}
