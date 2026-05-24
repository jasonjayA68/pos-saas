import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import type { ActiveMember } from "@/lib/auth/dal";
import type { Permission } from "@/lib/auth/permissions";

// Integration tests hit a real Postgres. Order of preference:
//   1. TEST_DATABASE_URL (preferred — isolates from dev data)
//   2. DIRECT_URL (your dev DB; safe because we cascade-delete fixtures)
const connectionString =
  process.env.TEST_DATABASE_URL ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Set TEST_DATABASE_URL (or DIRECT_URL/DATABASE_URL) to run integration tests.",
  );
}

// Match the project's driver-adapter setup (see lib/db/client.ts).
export const testPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// ── Fixture builders ──────────────────────────────────────────────────

export type TestBusinessFixture = {
  businessId: string;
  ownerUserId: string;
  branchId: string;
  ownerEmail: string;
};

export async function createTestBusiness(): Promise<TestBusinessFixture> {
  const ownerUserId = randomUUID();
  const ownerEmail = `test-${ownerUserId.slice(0, 8)}@vitest.local`;

  await testPrisma.user.create({
    data: { id: ownerUserId, email: ownerEmail, fullName: "Test Owner" },
  });

  const ownerRole = await testPrisma.role.findFirstOrThrow({
    where: { businessId: null, name: "owner", isSystem: true },
  });

  const business = await testPrisma.business.create({
    data: {
      name: `Test Business ${ownerUserId.slice(0, 4)}`,
      slug: `test-biz-${ownerUserId.slice(0, 8)}`,
      ownerUserId,
    },
  });

  const branch = await testPrisma.branch.create({
    data: { businessId: business.id, name: "Main", isDefault: true },
  });

  await testPrisma.businessMember.create({
    data: { businessId: business.id, userId: ownerUserId, roleId: ownerRole.id },
  });

  return {
    businessId: business.id,
    ownerUserId,
    branchId: branch.id,
    ownerEmail,
  };
}

type ProductOpts = {
  priceCentavos?: number;
  taxRateBps?: number;
  trackInventory?: boolean;
  quantity?: number; // if set, creates an InventoryLevel at this branch
  branchId?: string;
};

export async function createTestProduct(
  businessId: string,
  opts: ProductOpts = {},
) {
  const sku = `SKU-${randomUUID().slice(0, 8).toUpperCase()}`;
  const product = await testPrisma.product.create({
    data: {
      businessId,
      sku,
      name: `Test Product ${sku}`,
      priceCentavos: opts.priceCentavos ?? 10_000, // ₱100.00
      taxRateBps: opts.taxRateBps ?? 0,
      trackInventory: opts.trackInventory ?? true,
    },
  });

  if (opts.branchId && opts.quantity !== undefined) {
    await testPrisma.inventoryLevel.create({
      data: {
        businessId,
        branchId: opts.branchId,
        productId: product.id,
        quantity: opts.quantity,
      },
    });
  }
  return product;
}

export async function deleteTestBusiness(businessId: string): Promise<void> {
  const business = await testPrisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerUserId: true },
  });
  if (!business) return;
  // Cascade handles members, branches, products, inventory, sales,
  // subscription, subscription_payments, activity_logs.
  await testPrisma.business.delete({ where: { id: business.id } });
  // User has Restrict on owned businesses — safe to delete now that
  // the business is gone.
  await testPrisma.user.deleteMany({ where: { id: business.ownerUserId } });
}

// ── ActiveMember mock helper ─────────────────────────────────────────

// Build the ActiveMember shape that `requirePermission`/`getActiveMember`
// would return. Pass into `vi.mocked(dal.requirePermission).mockResolvedValue(...)`.
export function mockMember(
  fixture: TestBusinessFixture,
  permissions: Permission[],
  roleName: "owner" | "manager" | "cashier" = "owner",
): ActiveMember {
  return {
    userId: fixture.ownerUserId,
    email: fixture.ownerEmail,
    fullName: "Test Owner",
    businessId: fixture.businessId,
    businessName: "Test Business",
    roleName,
    permissions,
  };
}
