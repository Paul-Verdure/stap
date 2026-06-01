import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppBar } from "@/components/layout/app-bar";
import { MiniRhythm, type RhythmDay } from "@/components/ui/rhythm";
import { Helper, Question } from "@/components/ui/typography";

// Placeholder — the three-state daily challenge is built in G4. The rhythm is
// sample data for now; G4 wires the real per-user week.
const SAMPLE_WEEK: RhythmDay[] = [
  { state: "at-ease" },
  { state: "hesitant" },
  { state: "missed" },
  { state: "skip" },
  { state: "at-ease" },
  { state: "empty" },
  { state: "empty", today: true },
];

export default async function TodayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Today");

  return (
    <>
      <AppBar
        right={
          <MiniRhythm
            days={SAMPLE_WEEK}
            size="sm"
            ariaLabel="This week: 3 steps"
          />
        }
      />
      <main id="main-content" className="flex-1 px-5 pb-5">
        <Question>{t("title")}</Question>
        <Helper className="mt-3">{t("placeholder")}</Helper>
      </main>
    </>
  );
}
