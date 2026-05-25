import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  PAYMONGO_SECRET_KEY: z.string().optional(),
  PAYMONGO_WEBHOOK_SECRET: z.string().optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;

const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

const parsed = serverSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  SUPABASE_SECRET_KEY: supabaseSecret,
  PAYMONGO_SECRET_KEY: process.env.PAYMONGO_SECRET_KEY,
  PAYMONGO_WEBHOOK_SECRET: process.env.PAYMONGO_WEBHOOK_SECRET,
});

// Build-phase tolerance — see lib/env.ts for full rationale. Vercel's
// build phase sometimes runs before all env vars are populated; throwing
// at module import crashes every server file. We log loudly and let the
// build complete; runtime requests will fail clearly if env isn't set.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (!parsed.success && !isBuildPhase) {
  throw new Error(
    `Invalid server env: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  );
}

if (!parsed.success && isBuildPhase) {
  // eslint-disable-next-line no-console
  console.warn(
    "\n[env.server] ⚠ Missing server env vars during build:\n" +
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2) +
      "\n[env.server] Build will continue with placeholders. Runtime " +
      "requests will fail unless these are set in Vercel project settings.\n",
  );
}

const fallback: ServerEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://placeholder",
  DIRECT_URL: "postgresql://placeholder",
  SUPABASE_SECRET_KEY: "placeholder",
  PAYMONGO_SECRET_KEY: undefined,
  PAYMONGO_WEBHOOK_SECRET: undefined,
};

export const serverEnv: ServerEnv = parsed.success ? parsed.data : fallback;
