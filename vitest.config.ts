import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

// Two projects in one config:
//   - "unit"        → pure logic + mocked-Prisma tests, runs in any env
//   - "integration" → hits the real Postgres in TEST_DATABASE_URL,
//                     serialized so we don't race on shared rows
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["./tests/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["./tests/setup.ts"],
          testTimeout: 30_000,
          // One worker, one fork — Postgres is shared state across files.
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": root,
      // `server-only` throws at import time outside a Server Component.
      // We stub it for tests; it has no runtime semantics, just build-time
      // tree-shaking enforcement.
      "server-only": path.resolve(root, "tests/stubs/server-only.ts"),
    },
  },
});
