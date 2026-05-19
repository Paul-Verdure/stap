import { getTranslations, setRequestLocale } from "next-intl/server";

import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/user";

// Scaffolding placeholder — exercises the design system tokens and i18n for
// visual validation. Now also a protected route: the proxy guarantees a
// session here, so getCurrentUser() is non-null. To be replaced by the real
// UI in a later step.
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tAuth = await getTranslations("Auth");
  const user = await getCurrentUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-5">
      <div className="border-structural max-w-md rounded-lg bg-surface p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent">
          {t("kicker")}
        </p>
        <h1 className="mt-4 font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.5px]">
          {t("title")}
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          {t("subtitle")}
        </p>

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-muted">
            {tAuth("signedInAs")}
          </p>
          <p className="mt-1 font-mono text-[13px] break-all">{user?.email}</p>
          <form action={signOut} className="mt-4">
            <button
              type="submit"
              className="border-structural rounded-md px-4 py-2 text-[13px] font-bold"
            >
              {tAuth("signOut")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
