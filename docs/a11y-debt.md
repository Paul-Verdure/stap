# Accessibility debt

Tracks accepted, known accessibility gaps so they are not mistaken for fresh
regressions. The shipped bar is **0 axe violations on every page state with all
modals closed, light AND dark** (what G1–G7 shipped and G8 keeps). The items
below are explicitly out of that bar for now.

## Modal-open axe findings (app-wide, since G6)

When any modal built on the shared primitive (`components/ui/modal.tsx` —
`CenteredModal` / `BottomSheet`, Radix Dialog) is **open**, axe reports:

- `aria-hidden-focus` — Radix `aria-hidden`s the background siblings (header,
  sections, bottom nav) but their buttons/links stay focusable.
- `page-has-heading-one` — the page's only `<h1>` (the TopBar) is inside the
  aria-hidden background; the modal title is an `<h2>`.
- `scrollable-region-focusable` — on text-only modals (e.g. the journey "Coming
  in v2" placeholder) the scrollable body has no focusable child.

Modal-**closed** pages are clean. This is pre-existing (present since the G6
Journal filters sheet) and not specific to G8.

### Why it is debt and not fixed

G8 implemented a fix (inert background + modal-owned `<main>`/`<h1>` + a
focusable scroll region) in commit `6c2ad42` and **reverted it** in `e308efc`:
mutating many elements to `inert` in a mount effect stuttered the open
animation, and the approach was rejected. Do **not** re-apply that exact
approach without sign-off.

### How modals ARE verified meanwhile

Per the G8 handoff, modal correctness is asserted via the DOM rather than axe:
focus trap + restore-to-trigger on close, Escape + backdrop dismiss, scroll
lock (`data-scroll-locked`), and siblings receiving `aria-hidden`. Radix omits
`aria-modal` deliberately, so modality is checked through those signals.

### Future fix (needs design sign-off)

A non-stuttering approach would apply `inert` off the animation critical path —
e.g. after the open transition via Radix `onOpenChange`, or with the platform
`inert` driven from open state rather than a broad mount-time DOM sweep — and
still give the open modal the single `main`/`h1`. Treat as a focused, separate
a11y task.
