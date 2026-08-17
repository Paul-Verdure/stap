import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/* ===========================================================================
   Vitest — unit tests for the pure logic only.

   Scope on purpose: everything under `tests/` runs with no database, no
   network and no Next runtime, so `pnpm test` is fast enough to run on every
   save and safe to run in CI without secrets. Anything needing Prisma or a
   session belongs in an end-to-end suite, which is a separate decision (it
   needs a disposable database and a way past the magic link).

   The alias mirrors the `@/*` path in tsconfig.json; it is spelled out here
   rather than pulled from a plugin so the test runner keeps zero extra deps.
=========================================================================== */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
