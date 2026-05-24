import { config as loadEnv } from "dotenv";
import { defineConfig } from "@prisma/config";

loadEnv({ path: ".env.local", override: false });
loadEnv({ override: false });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    [
      "Neither DIRECT_URL nor DATABASE_URL is set.",
      "Add one of them to .env.local at the project root.",
      "Get the string from Supabase → Project Settings → Database → Connection string.",
    ].join(" "),
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
