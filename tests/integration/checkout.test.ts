import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mock DAL before importing the action so the action picks up our mocks.
vi.mock("@/lib/auth/dal", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/auth/dal")>();
  return {
    ...actual,
    requirePermission: vi.fn(),
    getActiveMember: vi.fn(),
    verifySession: vi.fn(),
    getPlatformAdminStatus: vi.fn(),
    verifyPlatformAdmin: vi.fn(),
  };
});

import { createSale } from "@/features/sales/actions";
import * as dal from "@/lib/auth/dal";
import {
  createTestBusiness,
  createTestProduct,
  deleteTestBusiness,
  mockMember,
  testPrisma,
  type TestBusinessFixture,
} from "../helpers/fixtures";

describe("createSale (integration, real DB)", () => {
  let fixture: TestBusinessFixture;
  let otherFixture: TestBusinessFixture;
  let productId: string;
  let untrackedProductId: string;
  let crossTenantProductId: string;

  beforeAll(async () => {
    fixture = await createTestBusiness();
    otherFixture = await createTestBusiness();

    const product = await createTestProduct(fixture.businessId, {
      branchId: fixture.branchId,
      quantity: 10,
      priceCentavos: 10_000,
    });
    productId = product.id;

    const untracked = await createTestProduct(fixture.businessId, {
      priceCentavos: 5_000,
      trackInventory: false,
    });
    untrackedProductId = untracked.id;

    const otherProduct = await createTestProduct(otherFixture.businessId, {
      branchId: otherFixture.branchId,
      quantity: 100,
    });
    crossTenantProductId = otherProduct.id;

    vi.mocked(dal.requirePermission).mockResolvedValue(
      mockMember(fixture, ["sale:create", "sale:read", "inventory:update"]),
    );
  });

  afterAll(async () => {
    await deleteTestBusiness(fixture.businessId);
    await deleteTestBusiness(otherFixture.businessId);
    await testPrisma.$disconnect();
  });

  it("creates a sale, writes items, deducts inventory, logs movement", async () => {
    const result = await createSale({
      branchId: fixture.branchId,
      items: [{ productId, quantity: 3 }],
      paymentMethod: "CASH",
      amountPaidCentavos: 30_000,
      discountCentavos: 0,
      idempotencyKey: "happy-path",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sale = await testPrisma.sale.findFirst({
      where: { businessId: fixture.businessId, idempotencyKey: "happy-path" },
      include: { items: true },
    });
    expect(sale).not.toBeNull();
    expect(sale!.items).toHaveLength(1);
    expect(sale!.totalCentavos).toBe(30_000);
    expect(sale!.paymentStatus).toBe("PAID");

    const level = await testPrisma.inventoryLevel.findUnique({
      where: {
        businessId_branchId_productId: {
          businessId: fixture.businessId,
          branchId: fixture.branchId,
          productId,
        },
      },
    });
    expect(level!.quantity.toNumber()).toBe(7); // 10 − 3

    const movement = await testPrisma.inventoryMovement.findFirst({
      where: { referenceId: sale!.id, type: "SALE" },
    });
    expect(movement).not.toBeNull();
    expect(movement!.quantityDelta.toNumber()).toBe(-3);
  });

  it("is idempotent — same key returns the same sale, doesn't deduct twice", async () => {
    const args = {
      branchId: fixture.branchId,
      items: [{ productId, quantity: 1 }],
      paymentMethod: "CASH" as const,
      amountPaidCentavos: 10_000,
      discountCentavos: 0,
      idempotencyKey: "idem-key",
    };
    const r1 = await createSale(args);
    const r2 = await createSale(args);
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.data.saleId).toBe(r2.data.saleId);

    const count = await testPrisma.sale.count({
      where: { businessId: fixture.businessId, idempotencyKey: "idem-key" },
    });
    expect(count).toBe(1);
  });

  it("rolls back atomically when stock is insufficient", async () => {
    const before = await testPrisma.inventoryLevel.findUnique({
      where: {
        businessId_branchId_productId: {
          businessId: fixture.businessId,
          branchId: fixture.branchId,
          productId,
        },
      },
    });
    const startingQty = before!.quantity.toNumber();

    const result = await createSale({
      branchId: fixture.branchId,
      items: [{ productId, quantity: 9_999 }],
      paymentMethod: "CASH",
      amountPaidCentavos: 99_990_000,
      discountCentavos: 0,
      idempotencyKey: "oversell",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONFLICT");

    // Inventory untouched
    const after = await testPrisma.inventoryLevel.findUnique({
      where: {
        businessId_branchId_productId: {
          businessId: fixture.businessId,
          branchId: fixture.branchId,
          productId,
        },
      },
    });
    expect(after!.quantity.toNumber()).toBe(startingQty);

    // No sale row written
    const sale = await testPrisma.sale.findFirst({
      where: { businessId: fixture.businessId, idempotencyKey: "oversell" },
    });
    expect(sale).toBeNull();
  });

  it("rejects cash underpayment with VALIDATION", async () => {
    const result = await createSale({
      branchId: fixture.branchId,
      items: [{ productId, quantity: 1 }],
      paymentMethod: "CASH",
      amountPaidCentavos: 5_000, // < 10_000 owed
      discountCentavos: 0,
      idempotencyKey: "underpay",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION");
  });

  it("non-cash payment locks amountPaid to total (no tipping leakage)", async () => {
    const result = await createSale({
      branchId: fixture.branchId,
      items: [{ productId, quantity: 1 }],
      paymentMethod: "GCASH",
      amountPaidCentavos: 999_999, // intentionally absurd
      discountCentavos: 0,
      idempotencyKey: "gcash-overpay",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sale = await testPrisma.sale.findUnique({
      where: { id: result.data.saleId },
    });
    expect(sale!.amountPaidCentavos).toBe(sale!.totalCentavos);
    expect(sale!.changeCentavos).toBe(0);
  });

  it("does not deduct inventory for non-tracked products", async () => {
    const result = await createSale({
      branchId: fixture.branchId,
      items: [{ productId: untrackedProductId, quantity: 5 }],
      paymentMethod: "CASH",
      amountPaidCentavos: 25_000,
      discountCentavos: 0,
      idempotencyKey: "untracked",
    });
    expect(result.ok).toBe(true);

    const level = await testPrisma.inventoryLevel.findUnique({
      where: {
        businessId_branchId_productId: {
          businessId: fixture.businessId,
          branchId: fixture.branchId,
          productId: untrackedProductId,
        },
      },
    });
    // No row created at all for untracked items
    expect(level).toBeNull();
  });

  it("blocks IDOR via cross-tenant product ID", async () => {
    const result = await createSale({
      branchId: fixture.branchId,
      items: [{ productId: crossTenantProductId, quantity: 1 }],
      paymentMethod: "CASH",
      amountPaidCentavos: 10_000,
      discountCentavos: 0,
      idempotencyKey: "cross-tenant",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });

  it("clamps discount to subtotal so totals can't go negative", async () => {
    const result = await createSale({
      branchId: fixture.branchId,
      items: [{ productId, quantity: 1 }], // subtotal 10_000
      paymentMethod: "CASH",
      amountPaidCentavos: 0,
      discountCentavos: 9_999_999, // huge discount
      idempotencyKey: "discount-clamp",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sale = await testPrisma.sale.findUnique({
      where: { id: result.data.saleId },
    });
    expect(sale!.discountCentavos).toBe(10_000); // clamped to subtotal
    expect(sale!.totalCentavos).toBe(0);
  });
});
