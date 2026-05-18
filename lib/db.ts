import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

// Prisma 7: the runtime connection goes through a driver adapter (no more Rust
// query engine). The app connects to the Supavisor pooler via DATABASE_URL (6543).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Singleton: in dev, Next.js hot-reload would re-instantiate PrismaClient on
// every reload and exhaust the connection pool. Memoize it on the global object.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
