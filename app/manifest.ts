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
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
