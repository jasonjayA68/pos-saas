import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ override: false });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from "../lib/auth/permissions";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to seed");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedSystemRoles(): Promise<void> {
  for (const name of SYSTEM_ROLES) {
    const existing = await prisma.role.findFirst({
      where: { businessId: null, name, isSystem: true },
    });
    const data = {
      name,
      businessId: null,
      isSystem: true,
      description: ROLE_DESCRIPTIONS[name],
      permissions: ROLE_PERMISSIONS[name],
    };
    if (existing) {
      await prisma.role.update({ where: { id: existing.id }, data });
    } else {
      await prisma.role.create({ data });
    }
    console.log(`✔ role: ${name}`);
  }
}

async function seedPlans(): Promise<void> {
  const plans = [
    {
      code: "starter",
      name: "Starter",
      description:
        "For single-branch shops just getting set up. POS, inventory, basic reports.",
      priceCentavos: 49900,
      billingInterval: "MONTHLY" as const,
      maxUsers: 3,
      maxProducts: 500,
      maxBranches: 1,
      features: {
        pos: true,
        inventory: true,
        basicReports: true,
        customerDb: true,
        ecommerce: false,
        multiBranch: false,
        advancedReports: false,
        prioritySupport: false,
      },
    },
    {
      code: "business",
      name: "Business",
      description:
        "Growing businesses with a team. Adds advanced reports, more users, more products.",
      priceCentavos: 99900,
      billingInterval: "MONTHLY" as const,
      maxUsers: 10,
      maxProducts: 5000,
      maxBranches: 2,
      features: {
        pos: true,
        inventory: true,
        basicReports: true,
        advancedReports: true,
        customerDb: true,
        ecommerce: false,
        multiBranch: true,
        prioritySupport: false,
      },
    },
    {
      code: "pro",
      name: "Pro",
      description:
        "Multi-branch businesses. Unlimited features, priority support, everything unlocked.",
      priceCentavos: 199900,
      billingInterval: "MONTHLY" as const,
      maxUsers: 25,
      maxProducts: 25000,
      maxBranches: 10,
      features: {
        pos: true,
        inventory: true,
        basicReports: true,
        advancedReports: true,
        customerDb: true,
        ecommerce: true,
        multiBranch: true,
        prioritySupport: true,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
    console.log(`✔ plan: ${plan.code}`);
  }
}

async function seedBillingSettings(): Promise<void> {
  const existing = await prisma.platformBillingSettings.findUnique({
    where: { id: "singleton" },
  });
  if (existing) {
    console.log("✔ billing settings: already exists, skipping");
    return;
  }
  await prisma.platformBillingSettings.create({
    data: {
      id: "singleton",
      instructions:
        "Send the exact amount, take a screenshot of the receipt, and submit it on the payment page. Approvals are reviewed within 24 hours on business days.",
    },
  });
  console.log("✔ billing settings: created empty singleton");
}

async function main(): Promise<void> {
  console.log("Seeding system roles…");
  await seedSystemRoles();
  console.log("Seeding plans…");
  await seedPlans();
  console.log("Seeding platform billing settings…");
  await seedBillingSettings();
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
