# 0006 — The app icon is a drawn staircase, rasterized to PNG from an SVG master

- Status: Accepted
- Date: 2026-08-26
- Deciders: Project owner
- Supersedes: —
- Superseded by: —

## Context

The icon on an installed iPhone was not the icon the project thought it had
shipped, and three separate things were wrong at once.

**iOS had nothing to read.** The app declared no `apple-touch-icon` link and no
`icons` in its Next metadata; the manifest offered SVG only, which Safari does
not reliably consume for a home-screen icon. With no raster and no link tag,
iOS falls back to a screenshot of the page.

**The typeface never applied.** The mark was the letter S in
`font-family="Syne"`. An icon is fetched as an isolated image and cannot load a
webfont, so it rendered in whatever the platform's UI font happens to be — the
one glyph in the product that was guaranteed not to be Stap's.

**The drawing was timid.** Beige field, a 12-unit ink hairline, a black letter:
it disappears against a light wallpaper, the hairline becomes a stray pixel at
60 px, and it used none of the amber that identifies Stap at a glance.

## Decision

**A staircase of three equal ascending steps, amber on an ink field**, drawn as
geometry and rasterized from an SVG master by a committed script.

*Stap* is Dutch for "step", so the mark draws the word rather than initialling
it — and the product it names is one step a day. Three details carry the work:

- **The steps are one connected silhouette.** Drawn as three separate columns
  the same idea reads as a bar chart, which is the icon of an analytics app.
  Connected, it reads as stairs immediately. This was caught by rendering it,
  not by reasoning about it.
- **The mark is centred on its centroid, not its bounding box.** A staircase
  carries its mass low and to the right; a box-centred one looks like it is
  sliding out of the frame. The offset puts the centre of mass on 256,256 and
  still keeps every corner ~191 units from centre, inside the 205 that
  Android's 80 % maskable safe circle allows.
- **Ink field, amber mark.** The pairing the design system already reserves for
  the hero, and the only one legible on a light and a dark home screen alike.
  No letter, so no font to fail to load.

Two masters, five rasters. `icon.svg` carries a corner radius, for surfaces
that apply no mask of their own; `icon-maskable.svg` is its full-bleed twin,
for Android's maskable purpose and for iOS, which supplies its own squircle and
renders transparent corners as artefacts. `pnpm icons:generate` derives the
180 px apple-touch icon, 192/512 PNGs, the maskable 512, and `favicon.ico` —
all committed, the same arrangement the catalog audio uses.

## Consequences

- The rasters are generated, so **a master edited without re-running the script
  ships a stale icon**. That is the standing hazard of this arrangement, and the
  reason the script is one command with no arguments.
- `@resvg/resvg-js` joins devDependencies: an SVG-in, PNG-out rasterizer with
  no system libraries behind it. CI never runs the script but does install it,
  which is the price of keeping the masters as the single source of truth rather
  than hand-maintaining five files.
- The `.ico` is assembled by hand — a 6-byte directory, one entry per image,
  then PNG payloads, which every browser in use accepts. That is cheaper than a
  second image dependency for one 400-byte file.
- The favicon was still Next's default until now, which is a small thing that
  reads loudly on a portfolio project.
- What remains unverified is the only thing that cannot be verified here: how
  the icon looks on a physical iPhone home screen. Everything upstream of that
  is checked — the link tag is emitted, all five assets serve with the right
  content type, and Chromium decodes each of them, the hand-built `.ico`
  included.
