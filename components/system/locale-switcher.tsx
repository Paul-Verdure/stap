"use client";

import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";

/* ===========================================================================
   LocaleSwitcher — TEMPORARY (G2.5). Lives on the profile placeholder until
   G8 replaces it with the proper language modal. Switches the UI locale live
   while preserving the current path (next-intl re-prefixes it).

   The option labels are each written in their OWN language (English /
   Français) and are invariant — never translated. Mirrors the brutalist
   segmented control of ThemeToggle; no color transition (instant swap).
=========================================================================== */

const LOCALES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Profile");

  return (
    <div
      role="radiogroup"
      aria-label={t("interface")}
      className="border-structural inline-flex items-center gap-0 rounded-md bg-surface p-1"
    >
      {LOCALES.map(({ code, label }) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            lang={code}
            onClick={() => router.replace(pathname, { locale: code })}
            className={[
              "rounded-sm px-3 py-1.5 text-helper font-semibold",
              active
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
