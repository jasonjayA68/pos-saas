import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ override: false });

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function fail(msg: string): never {
  console.error(`✘ ${msg}`);
  process.exit(1);
}

const [email, password, fullName, businessName] = process.argv.slice(2);
if (!email || !password || !fullName || !businessName) {
  console.error(
    'Usage: npm run tenant:create -- <email> <password> "Full Name" "Business Name"',
  );
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function main(): Promise<void> {
  // 1. Find or create the auth user (no email sent — admin API with email_confirm)
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
        full_name: fullName,
        business_name: businessName,
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
      user_metadata: { full_name: fullName, business_name: businessName },
    });
    if (error || !data.user) {
      fail(`Failed to create auth user: ${error?.message ?? "unknown"}`);
    }
    authUser = data.user;
    console.log(`✔ Created auth user (${authUser.id})`);
  }

  // 2. Owner role must exist (seeded)
  const ownerRole = await prisma.role.findFirst({
    where: { businessId: null, name: "owner", isSystem: true },
  });
  if (!ownerRole) {
    fail('System role "owner" is missing. Run `npm run db:seed` first.');
  }

  // 3. If the user already has a business, just print it
  const existing = await prisma.businessMember.findFirst({
    where: { userId: authUser.id, deletedAt: null },
    include: { business: true },
  });
  if (existing) {
    console.log(
      `✔ User already a member of "${existing.business.name}" (${existing.businessId})`,
    );
    console.log("");
    console.log(`Log in at:  http://localhost:3000/login`);
    console.log(`Email:      ${email}`);
    console.log(`Lands at:   /dashboard`);
    return;
  }

  // 4. Create business + branch + membership in a transaction
  const slug = `${slugify(businessName) || "business"}-${randomBytes(3).toString("hex")}`;

  const business = await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: authUser.id },
      update: { fullName },
      create: {
        id: authUser.id,
        email,
        fullName,
        isPlatformAdmin: false,
      },
    });

    const created = await tx.business.create({
      data: {
        name: businessName,
        slug,
        ownerUserId: authUser.id,
      },
    });

    await tx.branch.create({
      data: {
        businessId: created.id,
        name: "Main",
        isDefault: true,
      },
    });

    await tx.businessMember.create({
      data: {
        businessId: created.id,
        userId: authUser.id,
        roleId: ownerRole.id,
      },
    });

    return created;
  });

  console.log(`✔ Created business "${business.name}" (${business.id})`);
  console.log(`✔ Created default branch "Main"`);
  console.log(`✔ Linked user as owner`);
  console.log("");
  console.log(`Log in at:  http://localhost:3000/login`);
  console.log(`Email:      ${email}`);
  console.log(`Lands at:   /dashboard`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
