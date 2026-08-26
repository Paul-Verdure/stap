import type { MetadataRoute } from "next";

// PWA manifest — Next typed metadata route, served at /manifest.webmanifest.
// Colors come from the frozen design system (soft brutalism).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stap — Leer Nederlands",
    short_name: "Stap",
    description: "Apprendre le néerlandais, pas à pas.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F0E8",
    theme_color: "#1A1A1A",
    // PNG, not SVG. Safari does not consume a vector for a home-screen icon
    // and Chrome's support has been uneven, so the raster files are the ones
    // that count; the SVG is offered last, for anything that prefers it.
    // All four are generated from the two masters by `pnpm icons:generate`.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
