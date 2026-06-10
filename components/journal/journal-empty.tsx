import { useTranslations } from "next-intl";

import { Cta } from "@/components/ui/button";
import { RhythmUnit } from "@/components/ui/rhythm";
import { Helper } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";

/* ===========================================================================
   JournalEmpty (G6) — the branded truly-empty state (zero entries ever).
   ---------------------------------------------------------------------------
   The illustration is the rhythm vocabulary itself: three empty cells and an
   amber missed-state cell — honest ("nothing yet") and warm (even a missed
   step is a step). Decorative only; the copy carries the meaning. The CTA
   sends the user to today's challenge — the only way a journal begins.
=========================================================================== */
export function JournalEmpty() {
  const t = useTranslations("Journal");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div aria-hidden className="flex items-center gap-2.5">
        <RhythmUnit state="empty" size="lg" />
        <RhythmUnit state="empty" size="lg" />
        <RhythmUnit state="empty" size="lg" />
        <RhythmUnit state="missed" size="lg" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-greeting">{t("emptyTitle")}</h2>
        <Helper className="text-balance">{t("emptyBody")}</Helper>
      </div>
      <Cta asChild variant="ink">
        <Link href="/today">{t("emptyCta")}</Link>
      </Cta>
    </div>
  );
}
