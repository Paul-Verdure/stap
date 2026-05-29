import { setRequestLocale } from "next-intl/server";

import { ThemeToggle } from "@/components/system/theme-toggle";
import {
  countSteps,
  MiniRhythm,
  type RhythmDay,
  RhythmUnit,
  type RhythmState,
} from "@/components/ui/rhythm";
import {
  DateLine,
  Eyebrow,
  Greeting,
  Helper,
  Nl,
  Question,
  SectionHead,
  SectionRule,
} from "@/components/ui/typography";

// Stap design-system gallery. Pure visual reference; no business imports.
// Accrues a section per G1 sub-session (G1.1 tokens, G1.2 typography, …).

export const metadata = {
  title: "Stap — Design system",
};

const PALETTE: { name: string; token: string; hex: string; note?: string }[] = [
  { name: "Background", token: "bg-background", hex: "#F5F0E8 ↔ #1A1A1A", note: "warm beige / ink" },
  { name: "Surface", token: "bg-surface", hex: "#FBF7F0 ↔ #242220", note: "beige-light / lifted dark" },
  { name: "Off-white", token: "bg-offwhite", hex: "#FFFFFF ↔ #2C2A28" },
  { name: "Foreground", token: "bg-foreground", hex: "#1A1A1A ↔ #F5F0E8", note: "ink / beige (text)" },
  { name: "Ink 2", token: "bg-ink-2", hex: "#2A2A2A ↔ #C4C0B8" },
  { name: "Muted", token: "bg-muted", hex: "#5A5650 ↔ #948F87", note: "warm gray (captions)" },
  { name: "Hairline", token: "bg-hairline", hex: "#E8E4DC ↔ #2E2C28" },
  { name: "Accent (amber)", token: "bg-accent", hex: "#E8A020 — invariant", note: "the only color" },
];

const TYPE_RAMP: { name: string; cls: string; sample: string }[] = [
  { name: "display 36/800 Syne", cls: "text-display font-display", sample: "Sophie Martin" },
  { name: "question 28/800 Syne", cls: "text-question font-display", sample: "Wat is je naam?" },
  { name: "greeting 22/700", cls: "text-greeting font-display", sample: "Hi Sophie," },
  { name: "body 15/400", cls: "text-body", sample: "The app doesn't replace real life — it sends you there." },
  { name: "helper 13", cls: "text-helper text-muted", sample: "Thu 28 May · 2/5" },
  { name: "eyebrow 11/700 uppercase", cls: "text-eyebrow font-display uppercase", sample: "Today · Step" },
];

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64];

const RADII: { name: string; cls: string; px: string }[] = [
  { name: "sm", cls: "rounded-sm", px: "6px — tags, badges" },
  { name: "md", cls: "rounded-md", px: "12px — buttons, secondary cards" },
  { name: "lg", cls: "rounded-lg", px: "16px — primary cards, hero" },
  { name: "xl", cls: "rounded-xl", px: "28px — sheets, full-screen modals" },
];

const RHYTHM_LEGEND: { state: RhythmState; name: string; desc: string }[] = [
  { state: "empty", name: "Empty", desc: "Outlined — no step that day" },
  { state: "at-ease", name: "At ease", desc: "Solid fill — attempted, at ease" },
  { state: "hesitant", name: "Hesitant", desc: "Half-diagonal — attempted, hesitant" },
  { state: "missed", name: "Missed it", desc: "Amber fill — still a step" },
  { state: "skip", name: "No chance", desc: "Dot — a non-attempt, not a step" },
];

// A representative sliding week: 4 steps, today still pending.
const SAMPLE_WEEK: RhythmDay[] = [
  { state: "at-ease", label: "Monday: at ease" },
  { state: "missed", label: "Tuesday: missed it" },
  { state: "hesitant", label: "Wednesday: hesitant" },
  { state: "skip", label: "Thursday: no chance" },
  { state: "at-ease", label: "Friday: at ease" },
  { state: "empty", today: true, label: "Saturday: today, no step yet" },
  { state: "empty", label: "Sunday: no step" },
];

export default async function DesignSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Locale-aware date for the DateLine demo (G2 ships the canonical
  // formatter; here we format inline to prove /en vs /fr divergence).
  const sample = new Date(2026, 4, 28); // Thu 28 May 2026
  const sampleIso = sample.toISOString();
  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(sample);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-5 py-10">
      <header className="flex flex-col gap-4">
        <Eyebrow>Stap · Design system</Eyebrow>
        <h1 className="font-display text-display">G1 — Primitives</h1>
        <p className="text-body text-muted">
          Frozen palette, type ramp, spacing, borders, radii (G1.1) and the
          typography &amp; layout primitives (G1.2). Toggle the theme to verify
          the ink/beige inversion; amber must remain identical.
        </p>
        <ThemeToggle />
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* G1.1 — Tokens                                                    */}
      {/* ---------------------------------------------------------------- */}

      <Section title="Palette" eyebrow="Colors">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PALETTE.map((c) => (
            <li
              key={c.name}
              className="border-hairline flex flex-col gap-2 rounded-md bg-surface p-3"
            >
              <div
                className={`border-hairline h-16 w-full rounded-sm ${c.token}`}
                aria-hidden
              />
              <div className="flex flex-col gap-0.5">
                <Eyebrow as="span">{c.name}</Eyebrow>
                <Helper as="span">{c.hex}</Helper>
                {c.note ? <Helper as="span">{c.note}</Helper> : null}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type tokens" eyebrow="Raw scale">
        <ul className="flex flex-col gap-5">
          {TYPE_RAMP.map((t) => (
            <li key={t.name} className="flex flex-col gap-1">
              <Eyebrow>{t.name}</Eyebrow>
              <p className={t.cls}>{t.sample}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Spacing (px)" eyebrow="8-px grid">
        <ul className="flex flex-wrap items-end gap-4">
          {SPACING.map((px) => (
            <li key={px} className="flex flex-col items-center gap-2">
              <span
                aria-hidden
                className="bg-foreground"
                style={{ width: `${px}px`, height: `${px}px` }}
              />
              <Helper as="span">{px}</Helper>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Borders" eyebrow="Strokes">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <li className="border-structural rounded-md bg-surface p-4">
            <Helper>border-structural</Helper>
            <p className="text-body">1.5px ink — cards, buttons</p>
          </li>
          <li className="border-hairline rounded-md bg-surface p-4">
            <Helper>border-hairline</Helper>
            <p className="text-body">1px hairline — separators</p>
          </li>
          <li className="border-dashed-ink rounded-md bg-surface p-4">
            <Helper>border-dashed-ink</Helper>
            <p className="text-body">1.5px dashed — add / disabled</p>
          </li>
        </ul>
      </Section>

      <Section title="Radii" eyebrow="Corners">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RADII.map((r) => (
            <li
              key={r.name}
              className={`border-structural flex h-24 flex-col items-center justify-center gap-1 bg-surface ${r.cls}`}
            >
              <Eyebrow as="span">{r.name}</Eyebrow>
              <Helper as="span">{r.px}</Helper>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Hero token preview" eyebrow="Signature treatment">
        {/* The parameterized HeroSurface arrives in G1.5. `surface-hero` is
            INVARIANT across themes (ink + amber); in dark mode it gains a
            beige border to stand out from the dark page. */}
        <div className="surface-hero rounded-lg p-5">
          <Eyebrow tone="accent">Today · Step</Eyebrow>
          <Question as="p" className="mt-3 text-hero-fg">
            Greet a colleague <span className="text-accent">in Dutch</span>
          </Question>
          <p className="mt-2 text-helper text-hero-muted">
            Amber stays amber across themes — that is the signature.
          </p>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* G1.2 — Typography & layout primitives                            */}
      {/* ---------------------------------------------------------------- */}

      <Section title="Typography primitives" eyebrow="G1.2 · Components">
        <div className="flex flex-col gap-8">
          <Specimen
            name="<Question>"
            note="Primary screen prompt — Syne 28/800. Defaults to <h1>."
          >
            <Question as="p">
              <Nl>Wat is je naam?</Nl>
            </Question>
          </Specimen>

          <Specimen
            name="<Greeting sub>"
            note="Welcome/status line + optional muted sub."
          >
            <Greeting as="p" sub="Thursday 28 May · 2 of 5">
              Hi Sophie,
            </Greeting>
          </Specimen>

          <Specimen
            name="<Eyebrow>"
            note="Uppercase label. tone='muted' on beige (default), tone='accent' is hero-only."
          >
            <div className="flex flex-col gap-3">
              <Eyebrow>Today · Step</Eyebrow>
              <div className="surface-hero inline-flex w-fit rounded-md px-3 py-2">
                <Eyebrow tone="accent">Today · Step (on hero)</Eyebrow>
              </div>
            </div>
          </Specimen>

          <Specimen name="<Helper>" note="Captions, hints under inputs (13px muted).">
            <Helper>We use your first name to greet you. Nothing else.</Helper>
          </Specimen>

          <Specimen
            name="<DateLine>"
            note={`Semantic <time>, locale-formatted (current locale: ${locale}).`}
          >
            <DateLine dateTime={sampleIso}>{formattedDate}</DateLine>
          </Specimen>

          <Specimen
            name="<SectionRule>"
            note="Full-rule pattern: uppercase label + thin full-width ink line."
          >
            <SectionRule>The situation</SectionRule>
          </Specimen>

          <Specimen
            name="<SectionHead>"
            note="Bilingual heading: EN title + NL subhead (warm gray, never bold, lang='nl')."
          >
            <div className="flex flex-col gap-4">
              <SectionHead as="h3" title="Key words" nl="de sleutelwoorden" />
              <SectionHead as="h3" title="The sentence" nl="de zin" />
            </div>
          </Specimen>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* G1.3 — Rhythm vocabulary                                         */}
      {/* ---------------------------------------------------------------- */}

      <Section title="Rhythm vocabulary" eyebrow="G1.3 · The week, not a streak">
        <div className="flex flex-col gap-8">
          <Specimen
            name="<RhythmUnit> — 5 states"
            note="Distinct by shape, not only color. Each carries a programmatic label."
          >
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {RHYTHM_LEGEND.map((item) => (
                <li key={item.state} className="flex items-center gap-3">
                  <RhythmUnit state={item.state} size="lg" label={item.name} />
                  <div className="flex flex-col">
                    <span className="text-body font-medium">{item.name}</span>
                    <span className="text-helper text-muted">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Specimen>

          <Specimen
            name="today variant"
            note="A thicker outline ring, combinable with any state (here: empty + at ease)."
          >
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <RhythmUnit state="empty" today size="lg" label="Today, no step yet" />
                <Helper as="span">empty · today</Helper>
              </div>
              <div className="flex items-center gap-3">
                <RhythmUnit state="at-ease" today size="lg" label="Today, at ease" />
                <Helper as="span">at-ease · today</Helper>
              </div>
            </div>
          </Specimen>

          <Specimen
            name="size scale"
            note="sm (topbar) · md (default) · lg (Feel cards)."
          >
            <div className="flex items-end gap-4">
              <RhythmUnit state="hesitant" size="sm" label="hesitant small" />
              <RhythmUnit state="hesitant" size="md" label="hesitant medium" />
              <RhythmUnit state="hesitant" size="lg" label="hesitant large" />
            </div>
          </Specimen>

          <Specimen
            name="<MiniRhythm>"
            note="7 units + caption. Matches the Home weekly-rhythm legend."
          >
            <MiniRhythm
              days={SAMPLE_WEEK}
              ariaLabel="This week, 4 steps: Monday at ease, Tuesday missed it, Wednesday hesitant, Thursday no chance, Friday at ease, Saturday is today with no step yet, Sunday no step."
              caption={`This week — ${countSteps(SAMPLE_WEEK)} steps`}
            />
          </Specimen>
        </div>
      </Section>
    </main>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <SectionRule>{eyebrow}</SectionRule>
      <SectionHead as="h2" title={title} />
      {children}
    </section>
  );
}

function Specimen({
  name,
  note,
  children,
}: {
  name: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-l border-hairline pl-4">
      <div className="flex flex-col gap-0.5">
        <code className="font-mono text-helper text-foreground">{name}</code>
        <Helper>{note}</Helper>
      </div>
      <div>{children}</div>
    </div>
  );
}
