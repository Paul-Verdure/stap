// Prisma 7 config (replaces the old schema.prisma-only behavior).
// Requires: prisma (dev), dotenv (dev). dotenv/config loads .env — Prisma 7
// no longer does it automatically.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // CLI commands (migrate, db pull, db push) use the Supabase DIRECT
  // connection (port 5432) — never the PgBouncer pooler (6543), which does
  // not support schema operations.
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
