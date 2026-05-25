import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Lazy/deferred Prisma client creation. Vercel's build phase can run
// without DATABASE_URL set (it only resolves at runtime), and throwing
// at module load would crash every server file. Strategy:
//   - With DATABASE_URL set: build the real adapter immediately
//   - Without it during build: return a Proxy that throws *only* on
//     actual query access, not on module evaluation — so Next.js's
//     page-data collection step doesn't crash
//   - Without it at runtime (NOT build phase): throw clearly
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    const isBuildPhase =
      process.env.NEXT_PHASE === "phase-production-build";
    if (isBuildPhase) {
      // eslint-disable-next-line no-console
      console.warn(
        "[db] DATABASE_URL missing during build — Prisma client will " +
          "throw on first query if it's still missing at runtime. Set " +
          "DATABASE_URL in Vercel project settings.",
      );
      return new Proxy({} as PrismaClient, {
        get(_target, prop) {
          throw new Error(
            `Cannot access prisma.${String(prop)}: DATABASE_URL is not set.`,
          );
        },
      });
    }
    throw new Error("DATABASE_URL is required");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
