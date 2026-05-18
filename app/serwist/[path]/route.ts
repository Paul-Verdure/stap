import { createSerwistRoute } from "@serwist/turbopack";

// Serwist on Next 16 / Turbopack: the service worker is bundled by esbuild
// and served from this Route Handler instead of a webpack plugin. It is
// reachable at /serwist/sw.js (see SerwistProvider in app/layout.tsx).
//
// The route segment is single-level ([path], not [...path]) on purpose:
// Serwist emits deterministic, flat file names (sw.js, sw.js.map, chunks).
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    // Use the native `esbuild` package (faster than esbuild-wasm, which is
    // the default on non-Windows). Requires esbuild + its postinstall.
    useNativeEsbuild: true,
    // Precache the offline fallback so it works with no network.
    // Localized route; default locale (en) — see app/sw.ts fallback.
    additionalPrecacheEntries: [{ url: "/en/~offline", revision: "1" }],
  });
