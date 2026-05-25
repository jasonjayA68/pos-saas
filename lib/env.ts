import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  // Optional. When set to a different origin than APP_URL, the proxy
  // enforces host-based portal separation: admin routes only on the
  // admin host, tenant routes only on the app host.
  NEXT_PUBLIC_ADMIN_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_KEY: z.string().min(1),
});

type PublicEnv = z.infer<typeof publicSchema>;

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const parsed = publicSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_KEY: supabaseKey,
});

// Vercel's build phase sometimes runs without all env vars populated
// (e.g. preview deployments missing branch-scoped vars, or the very
// first build before you've added them to project settings). Throwing
// at module import would crash every page that touches this file.
//
// Strategy:
//   - In build phase: log a loud warning, fall back to localhost
//     placeholders so the build completes
//   - At runtime: throw the helpful error as before
//   - In dev: throw as before
//
// If the env is actually missing at runtime in production, requests
// will fail clearly — but the build itself won't be a deployment
// blocker for users still setting up Vercel project settings.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (!parsed.success && !isBuildPhase) {
  throw new Error(
    `Invalid public env: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  );
}

if (!parsed.success && isBuildPhase) {
  // eslint-disable-next-line no-console
  console.warn(
    "\n[env] ⚠ Missing public env vars during build:\n" +
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2) +
      "\n[env] Build will continue with placeholders. The deployed app " +
      "WILL fail at runtime unless you set these in Vercel → Project " +
      "Settings → Environment Variables.\n",
  );
}

const fallback: PublicEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_ADMIN_URL: undefined,
  NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_KEY: "placeholder-key-do-not-use",
};

export const publicEnv: PublicEnv = parsed.success ? parsed.data : fallback;
