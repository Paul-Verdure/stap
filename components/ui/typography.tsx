import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ===========================================================================
   Stap typography & layout primitives (G1.2)
   ---------------------------------------------------------------------------
   Pure, server-renderable presentational components. No state, no client.
   They lock the design vocabulary so screens never hand-roll type styles.

   A11y contract reminders baked in here:
     - Dutch (learning target) is INVARIANT and must carry lang="nl" so screen
       readers switch pronunciation. `SectionHead.nl` and `<Nl>` enforce this.
     - Headings are configurable via `as` so each screen keeps a strict,
       single-h1 hierarchy (we never hardcode a level that forces a skip).
     - Amber text only appears on contrasted contexts; `Eyebrow tone="accent"`
       is documented as hero-only (see feedback_amber_contrast_rule).
=========================================================================== */

type HeadingTag = "h1" | "h2" | "h3" | "h4";

/* ---------------------------------------------------------------------------
   Nl — wraps an invariant Dutch fragment with lang="nl".
   Use anywhere Dutch appears inline (phrases, words, salutations).
--------------------------------------------------------------------------- */
export function Nl({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span lang="nl" className={className}>
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Question — the primary question/prompt of a screen (Syne 28/800).
   Home challenge, prepare, onboarding steps. Defaults to <h1>.
--------------------------------------------------------------------------- */
export function Question({
  as = "h1",
  children,
  className,
}: {
  // Usually the screen's heading; allow "p" when the visual style is wanted
  // without introducing a heading (e.g. inside a hero that already has one).
  as?: HeadingTag | "p";
  children: ReactNode;
  className?: string;
}) {
  const Tag = as as ElementType;
  return (
    <Tag className={cn("font-display text-question text-balance", className)}>
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------------------
   Greeting — welcome / status line (Syne 22/700) with an optional sub line.
   "Hi Sophie," + date · "Ready, Sara?" + timestamp.
   The greeting is the heading; the sub is a muted helper sibling.
--------------------------------------------------------------------------- */
export function Greeting({
  as = "h1",
  children,
  sub,
  className,
}: {
  as?: HeadingTag | "p";
  children: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  const Tag = as as ElementType;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Tag className="font-display text-greeting">{children}</Tag>
      {sub ? <p className="text-helper text-muted">{sub}</p> : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Eyebrow — small uppercase label (Syne 11/700).
   tone "muted"  → on beige surfaces (default, AA-safe).
   tone "accent" → amber, HERO-ONLY (amber on ink ≈ 10:1; never on beige).
--------------------------------------------------------------------------- */
export function Eyebrow({
  as = "p",
  tone = "muted",
  children,
  className,
}: {
  as?: "p" | "span" | HeadingTag;
  tone?: "muted" | "accent";
  children: ReactNode;
  className?: string;
}) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={cn(
        "font-display text-eyebrow uppercase",
        tone === "accent" ? "text-accent" : "text-muted",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------------------
   Helper — captions, hints, helper text under inputs (13px, muted).
--------------------------------------------------------------------------- */
export function Helper({
  as = "p",
  children,
  className,
}: {
  as?: "p" | "span";
  children: ReactNode;
  className?: string;
}) {
  const Tag = as as ElementType;
  return (
    <Tag className={cn("text-helper text-muted", className)}>{children}</Tag>
  );
}

/* ---------------------------------------------------------------------------
   DateLine — locale-formatted date/time (helper scale, muted).
   Semantic <time> when an ISO `dateTime` is provided. Formatting is the
   caller's job (G2 ships the locale-aware formatter); this is the styling +
   semantic wrapper only.
--------------------------------------------------------------------------- */
export function DateLine({
  dateTime,
  children,
  className,
}: {
  dateTime?: string;
  children: ReactNode;
  className?: string;
}) {
  const cls = cn("text-helper text-muted", className);
  if (dateTime) {
    return (
      <time dateTime={dateTime} className={cls}>
        {children}
      </time>
    );
  }
  return <span className={cls}>{children}</span>;
}

/* ---------------------------------------------------------------------------
   SectionRule — the "full-rule" pattern: an uppercase label followed by a
   thin full-width ink line. A visual section separator (brutalist structure),
   not a semantic heading on its own.
--------------------------------------------------------------------------- */
export function SectionRule({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Eyebrow as="span">{children}</Eyebrow>
      <span className="h-px flex-1 bg-foreground" aria-hidden />
    </div>
  );
}

/* ---------------------------------------------------------------------------
   SectionHead — bilingual section heading.
   EN title (localized, heading) + NL subhead (invariant, warm gray, NEVER
   bold, lang="nl"). The Stap signature for Preparation/Validation sections:
   "Key words / de sleutelwoorden".
--------------------------------------------------------------------------- */
export function SectionHead({
  as = "h2",
  title,
  nl,
  className,
}: {
  as?: HeadingTag;
  title: ReactNode;
  nl?: string;
  className?: string;
}) {
  const Tag = as as ElementType;
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <Tag className="font-display text-greeting">{title}</Tag>
      {nl ? (
        <span lang="nl" className="text-body font-normal text-muted">
          {nl}
        </span>
      ) : null}
    </div>
  );
}
