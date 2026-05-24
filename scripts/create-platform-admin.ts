import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ override: false });

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function fail(msg: string): never {
  console.error(`✘ ${msg}`);
  process.exit(1);
}

const [email, password, fullName] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: npm run admin:create -- <email> <password> [\"Full Name\"]");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!supabaseUrl) fail("NEXT_PUBLIC_SUPABASE_URL is not set in .env.local");
if (!supabaseSecret) fail("SUPABASE_SECRET_KEY is not set in .env.local");
if (!dbUrl) fail("DIRECT_URL (or DATABASE_URL) is not set in .env.local");

const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  // 1. Find or create the Supabase auth user.
  const listed = await supabase.auth.admin.listUsers({ perPage: 200 });
  let authUser = listed.data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (authUser) {
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        full_name: fullName ?? authUser.user_metadata?.full_name ?? "Platform Admin",
      },
    });
    if (error) {
      fail(`Failed to update existing auth user: ${error.message}`);
    }
    console.log(`✔ Auth user already existed (${authUser.id}) — password reset`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? "Platform Admin" },
    });
    if (error || !data.user) {
      fail(`Failed to create auth user: ${error?.message ?? "unknown"}`);
    }
    authUser = data.user;
    console.log(`✔ Created auth user (${authUser.id})`);
  }

  // 2. Upsert public.users with the platform-admin flag.
  await prisma.user.upsert({
    where: { id: authUser.id },
    update: {
      isPlatformAdmin: true,
      fullName: fullName ?? undefined,
    },
    create: {
      id: authUser.id,
      email,
      fullName: fullName ?? "Platform Admin",
      isPlatformAdmin: true,
    },
  });
  console.log(`✔ Promoted to platform admin`);
  console.log("");
  console.log(`Log in at:  http://localhost:3000/login`);
  console.log(`Email:      ${email}`);
  console.log(`Lands at:   /admin`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
