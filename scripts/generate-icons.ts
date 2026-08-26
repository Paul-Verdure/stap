/* ===========================================================================
   App icon rasterizer — `pnpm icons:generate`.
   ---------------------------------------------------------------------------
   The two SVG masters in public/icons are the source of truth; every raster
   here is derived from them and committed alongside, the same arrangement the
   catalog audio uses. Run this after editing a master.

   PNG is not a preference. Safari does not consume an SVG for a home-screen
   icon, and without an `apple-touch-icon` link iOS has nothing to show at all
   — which is the bug this script exists to close. See ADR 0006.
=========================================================================== */
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { Resvg } from "@resvg/resvg-js";

const ICONS = join(process.cwd(), "public", "icons");
const APP = join(process.cwd(), "app");

type Master = "icon.svg" | "icon-maskable.svg";

function rasterize(master: Master, size: number): Buffer {
  const svg = readFileSync(join(ICONS, master), "utf8");
  return Buffer.from(
    new Resvg(svg, {
      fitTo: { mode: "width", value: size },
      // The masters are opaque by design; a background option here would only
      // paper over a mistake in one of them.
      font: { loadSystemFonts: false },
    })
      .render()
      .asPng(),
  );
}

/* An .ico is a 6-byte directory header, one 16-byte entry per image, then the
   images. Every browser in use accepts PNG payloads inside that container
   (the Vista-era addition), so there is no BMP encoder to write and no image
   dependency to add for one 25 KB file. */
function ico(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries: Buffer[] = [];
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size: none
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const PNGS: { master: Master; out: string; dir: string; size: number; why: string }[] = [
  {
    // iOS masks every home-screen icon to its own squircle, so it takes the
    // full-bleed master. 180 is the @3x size; iOS downscales for the rest.
    master: "icon-maskable.svg",
    out: "apple-touch-icon.png",
    dir: ICONS,
    size: 180,
    why: "iOS home screen",
  },
  { master: "icon.svg", out: "icon-192.png", dir: ICONS, size: 192, why: "manifest, any" },
  { master: "icon.svg", out: "icon-512.png", dir: ICONS, size: 512, why: "manifest, any" },
  {
    master: "icon-maskable.svg",
    out: "icon-maskable-512.png",
    dir: ICONS,
    size: 512,
    why: "manifest, maskable",
  },
];

function kb(bytes: number): string {
  return `${String(Math.round(bytes / 102.4) / 10).padStart(5)} KB`;
}

for (const target of PNGS) {
  const png = rasterize(target.master, target.size);
  writeFileSync(join(target.dir, target.out), png);
  console.log(
    `${target.out.padEnd(26)} ${String(target.size).padStart(3)}px  ${kb(png.length)}   ${target.why}`,
  );
}

// The browser tab. Nothing masks a favicon and a corner radius is mush at
// 16px, so this one comes from the full-bleed master too.
const favicon = ico(
  [32, 16].map((size) => ({ size, png: rasterize("icon-maskable.svg", size) })),
);
writeFileSync(join(APP, "favicon.ico"), favicon);
console.log(`${"favicon.ico".padEnd(26)} 32+16  ${kb(favicon.length)}   browser tab`);
