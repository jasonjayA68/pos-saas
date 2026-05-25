import { config as loadEnv } from "dotenv";
import { defineConfig } from "@prisma/config";

loadEnv({ path: ".env.local", override: false });
loadEnv({ override: false });

// Use a placeholder URL when no real one is set. `prisma generate` only
// needs the URL to be syntactically valid — it doesn't open a connection.
// This unblocks the postinstall hook during Vercel's first build (before
// env vars are populated) and during CI runs that only need the generated
// client. At runtime, lib/db/client.ts uses the actual DATABASE_URL from
// the environment.
//
// Migrations + Prisma Studio still need a real URL — they connect
// directly. If you run those without env set, postgres itself fails
// loudly, which is the correct failure mode for those commands.
const PLACEHOLDER_URL = "postgresql://placeholder:5432/placeholder";
const url =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? PLACEHOLDER_URL;

if (url === PLACEHOLDER_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "[prisma.config] DIRECT_URL / DATABASE_URL not set — using a " +
      "placeholder. `prisma generate` will succeed, but migrations and " +
      "Studio require a real connection string in .env.local or your " +
      "host's environment.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
