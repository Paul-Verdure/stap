import { getTranslations } from "next-intl/server";

// Branded loading skeleton for (app) routes — outlined brutalist blocks, no
// spinner. Decorative shapes are aria-hidden; a single polite status text
// carries the meaning for assistive tech. Motion is limited to opacity and
// gated by motion-safe (the design forbids decorative motion otherwise).
export default async function Loading() {
  const t = await getTranslations("Status");

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-5">
      <p role="status" className="sr-only">
        {t("loading")}
      </p>

      {/* Top bar placeholder: wordmark block + rhythm row. */}
      <div aria-hidden className="flex items-center justify-between">
        <span className="h-6 w-20 rounded-sm bg-surface motion-safe:animate-pulse" />
        <div className="flex gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className="border-structural h-3 w-3 rounded-[3px] bg-transparent"
            />
          ))}
        </div>
      </div>

      {/* Hero challenge-card placeholder. */}
      <div
        aria-hidden
        className="border-structural h-44 rounded-lg bg-surface motion-safe:animate-pulse"
      />

      {/* Body line placeholders. */}
      <div aria-hidden className="flex flex-col gap-3">
        <span className="h-4 w-2/3 rounded-sm bg-surface motion-safe:animate-pulse" />
        <span className="h-4 w-1/2 rounded-sm bg-surface motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
