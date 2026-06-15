import { getTranslations } from "next-intl/server";

import { ReviewWiderLink } from "@/components/games/review-wider-link";
import { TopBar } from "@/components/layout/top-bar";
import { Cta } from "@/components/ui/button";
import { Question, Helper } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";

/* ===========================================================================
   LockedState (G7.6) — the Games tab before today's step.
   ---------------------------------------------------------------------------
   The games replay the day, so they open only once today's challenge is DONE.
   Until then this state shows a geometric illustration (an outlined square
   with an amber dot — the "skip" rhythm vocabulary scaled up), factual,
   non-guilting copy (the product never blames), the same dashed vocabulary
   link, and an ink CTA back to today's challenge. The bottom nav stays (the
   layout keeps it on /games) so this is never a dead end.
=========================================================================== */
export async function LockedState() {
  const t = await getTranslations("Games");

  return (
    <>
      <TopBar title={t("title")} />
      <main id="main-content" className="flex flex-1 flex-col gap-6 px-5 pb-5">
        <div className="flex flex-col items-center gap-5 pt-6 text-center">
          <LockedIllustration />
          <div className="flex flex-col gap-2">
            <Question as="p">{t("locked.headline")}</Question>
            <Helper>{t("locked.body")}</Helper>
          </div>
        </div>

        <div className="mt-auto">
          <ReviewWiderLink />
        </div>
      </main>

      <footer className="px-5 pb-4 pt-2">
        <Cta asChild variant="commitment">
          <Link href="/today">{t("locked.cta")}</Link>
        </Cta>
      </footer>
    </>
  );
}

/* Outlined square + amber dot — decorative; the copy carries the meaning. */
function LockedIllustration() {
  return (
    <span
      aria-hidden
      className="border-structural inline-grid h-24 w-24 place-items-center rounded-2xl bg-surface"
    >
      <span className="h-5 w-5 rounded-full bg-accent" />
    </span>
  );
}
