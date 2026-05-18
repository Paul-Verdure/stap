import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

// next-intl plugin: wires ./i18n/request.ts into the build so server
// components can resolve messages per request.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Compose plugins. withSerwist only adds esbuild to serverExternalPackages;
// withNextIntl adds the i18n request module + Turbopack/webpack config.
export default withNextIntl(withSerwist(nextConfig));
