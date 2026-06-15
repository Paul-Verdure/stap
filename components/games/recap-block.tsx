import type { ReactNode } from "react";

import { SectionRule } from "@/components/ui/typography";

/* ===========================================================================
   RecapBlock + RecapRow (G7.3) — the shared end-of-game recap.
   ---------------------------------------------------------------------------
   A titled section (full-rule label) over a list of individual ink-bordered
   cells separated by gap — the VocItem list vocabulary, never a gray
   separator list. Each game fills the rows: Match shows NL ↔ meaning, Fill
   shows the completed sentence, Listen shows a row + replay button. Purely
   presentational and server-renderable.
=========================================================================== */
export function RecapBlock({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionRule>{title}</SectionRule>
      <ul className="flex list-none flex-col gap-2 p-0">{children}</ul>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   RecapRow — one ink-bordered recap cell. Defaults to a justify-between row
   (term on the left, detail on the right); callers pass whatever fits.
--------------------------------------------------------------------------- */
export function RecapRow({ children }: { children: ReactNode }) {
  return (
    <li className="border-structural flex items-center justify-between gap-3 rounded-md bg-surface px-4 py-3">
      {children}
    </li>
  );
}
