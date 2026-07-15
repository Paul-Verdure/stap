import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  experimental: {
    // Client router cache: keep dynamic page segments reusable for 30s so
    // switching back to a tab just visited is instant instead of refetching
    // the whole RSC payload (the Next 15+ default is 0 — no caching at all).
    // 30s of staleness is harmless for a one-challenge-per-day app.
    staleTimes: {
      dynamic: 30,
    },
  },
};

// next-intl plugin: wires ./i18n/request.ts into the build so server
// components can resolve messages per request.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Compose plugins. withSerwist only adds esbuild to serverExternalPackages;
// withNextIntl adds the i18n request module + Turbopack/webpack config.
export default withNextIntl(withSerwist(nextConfig));
