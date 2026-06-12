import { getTranslations } from "next-intl/server";

import { ChevronIcon } from "@/components/ui/icons";
import { Helper } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";

/* ===========================================================================
   ReviewWiderLink (G7.1) — dashed alternative card pointing to the weekly
   vocabulary review stub. Dashed = "aside from today's path" (same vocabulary
   as the add-chip / disabled CTA), used on the hub and on the locked state.
=========================================================================== */
export async function ReviewWiderLink() {
  const t = await getTranslations("Games");

  return (
    <Link
      href="/games/review"
      className="border-dashed-ink flex items-center justify-between gap-3 rounded-md bg-transparent px-4 py-3"
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-body font-semibold text-foreground">
          {t("reviewWider.title")}
        </span>
        <Helper as="span">{t("reviewWider.desc")}</Helper>
      </span>
      <ChevronIcon aria-hidden className="h-4 w-4 shrink-0 text-foreground" />
    </Link>
  );
}
