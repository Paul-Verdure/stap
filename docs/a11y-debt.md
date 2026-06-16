# Accessibility debt

Tracks accepted, known accessibility gaps so they are not mistaken for fresh
regressions. The shipped bar is **0 axe violations on every page state, light
AND dark, with modals open or closed**.

There is currently **no open accessibility debt**.

## Resolved

### Modal-open axe findings (resolved in G8)

Modals built on the shared primitive (`components/ui/modal.tsx` —
`CenteredModal` / `BottomSheet`, Radix Dialog) used to report three axe
violations while **open** (app-wide since the G6 Journal filters sheet):

- `aria-hidden-focus` — Radix aria-hid the background but left its controls
  focusable.
- `page-has-heading-one` — the page's only `<h1>` (TopBar) was inside the
  aria-hidden background; the modal title was an `<h2>`.
- `scrollable-region-focusable` — text-only modals had a non-focusable scroll
  region.

**Fix** (`components/ui/modal.tsx`): while a modal is open, the background
top-level elements are marked `inert` (controls leave the tab order and the
a11y tree); the open modal carries the page's single `main` landmark
(`display:contents`) and its title is the `h1`; the scroll region is
focusable. A first attempt was reverted because it was entangled with a
separate Tailwind-v4 zoom-in animation bug; once that was fixed
(`@keyframes stap-zoom-in` animating scale only, not a stacked translate), the
inert approach was re-applied and is smooth. Modal correctness is also asserted
via the DOM (focus trap, restore-to-trigger, Escape + backdrop, scroll lock).
