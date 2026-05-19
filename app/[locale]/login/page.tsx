import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "./login-form";

// Public route (whitelisted in lib/supabase/middleware.ts). An authenticated
// user hitting this page is redirected home by the proxy.
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-5">
      <div className="border-structural w-full max-w-md rounded-lg bg-surface p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent">
          {t("kicker")}
        </p>
        <h1 className="mt-4 font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.5px]">
          {t("title")}
        </h1>
        <p className="mt-3 mb-6 text-[15px] leading-relaxed text-muted">
          {t("subtitle")}
        </p>
        <LoginForm
          labels={{
            emailLabel: t("emailLabel"),
            emailPlaceholder: t("emailPlaceholder"),
            submit: t("submit"),
            sending: t("sending"),
            sentTitle: t("sentTitle"),
            sentBody: t("sentBody"),
            error: t("error"),
          }}
        />
      </div>
    </main>
  );
}
