import { useTranslations } from "next-intl";

import { HeroSurface, Tag } from "@/components/ui/surface";
import { Eyebrow } from "@/components/ui/typography";

/* ===========================================================================
   IdentityCard (G8) — the Profile screen's ONLY hero surface.
   ---------------------------------------------------------------------------
   "Your card" member stamp: ink + amber + beige (invariant across themes via
   HeroSurface). The name is rendered in the Syne display face; the level code
   and "With Stap for N days" counter sit beneath it. No avatar.

   Heading hierarchy: the page <h1> is the TopBar title, so the name is a <p>
   styled as display type, not a heading. The name and CEFR code are invariant
   (proper noun / standard code) and are not localized.
=========================================================================== */
export function IdentityCard({
  name,
  level,
  uiLocale,
  days,
}: {
  name: string | null;
  level: "A0" | "A1" | "A2" | "B1" | "B2" | null;
  uiLocale: "en" | "fr";
  days: number;
}) {
  const t = useTranslations("Profile.identity");

  return (
    <HeroSurface as="section" padding="lg" aria-labelledby="identity-name">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow as="span" tone="accent">
            {t("stamp")}
          </Eyebrow>
          <Tag tone="hero">{t("member")}</Tag>
        </div>

        <p
          id="identity-name"
          className="font-display text-question font-bold text-hero-fg"
        >
          {name ?? t("namelessFallback")}
        </p>

        <p className="text-body text-hero-muted">
          {level
            ? t("levelLine", {
                level,
                language: t(`languages.${uiLocale}`),
              })
            : t("levelLineNoLevel", { language: t(`languages.${uiLocale}`) })}
        </p>

        {/* Amber TEXT is allowed here: the hero is an ink surface (~10:1). */}
        <p className="font-display text-eyebrow uppercase text-accent">
          {t("daysWith", { days })}
        </p>
      </div>
    </HeroSurface>
  );
}
