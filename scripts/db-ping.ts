// DB connectivity check — `pnpm db:ping`.
// Exercises the Prisma driver-adapter bridge (lib/db.ts -> Supavisor pooler)
// and prints the server identity. Use it to diagnose connection issues.
// dotenv/config: a standalone tsx script does not auto-load .env the way
// Next.js or prisma.config.ts does.
import "dotenv/config";

import { db } from "../lib/db";

type ProbeRow = {
  version: string;
  current_database: string;
  current_user: string;
};

async function main() {
  const rows = await db.$queryRaw<
    ProbeRow[]
  >`SELECT version(), current_database(), current_user`;

  const row = rows[0];
  console.log("Prisma connection OK\n");
  console.log("  PostgreSQL :", row.version);
  console.log("  database   :", row.current_database);
  console.log("  user       :", row.current_user);
}

main()
  .catch((err) => {
    console.error("Prisma connection FAILED:\n", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
