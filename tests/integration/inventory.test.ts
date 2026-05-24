import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

import {
  adjustStock,
  stockIn,
  stockOut,
} from "@/features/inventory/actions";
import * as dal from "@/lib/auth/dal";
import {
  createTestBusiness,
  createTestProduct,
  deleteTestBusiness,
  mockMember,
  testPrisma,
  type TestBusinessFixture,
} from "../helpers/fixtures";

describe("inventory actions (integration)", () => {
  let fixture: TestBusinessFixture;
  let crossFixture: TestBusinessFixture;
  let productId: string;
  let otherTenantBranchId: string;

  beforeAll(async () => {
    fixture = await createTestBusiness();
    crossFixture = await createTestBusiness();
    otherTenantBranchId = crossFixture.branchId;

    const product = await createTestProduct(fixture.businessId, {
      branchId: fixture.branchId,
      quantity: 0,
    });
    productId = product.id;

    vi.mocked(dal.requirePermission).mockResolvedValue(
      mockMember(fixture, ["inventory:read", "inventory:update"]),
    );
  });

  afterAll(async () => {
    await deleteTestBusiness(fixture.businessId);
    await deleteTestBusiness(crossFixture.businessId);
    await testPrisma.$disconnect();
  });

  it("stockIn adds to the existing level", async () => {
    const r = await stockIn({
      branchId: fixture.branchId,
      productId,
      quantity: 5,
      reason: "Initial restock",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.balanceAfter).toBe(5);
  });

  it("stockOut subtracts from the level", async () => {
    const r = await stockOut({
      branchId: fixture.branchId,
      productId,
      quantity: 2,
      reason: "Damaged",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.balanceAfter).toBe(3);
  });

  it("stockOut below zero is rejected with CONFLICT", async () => {
    const r = await stockOut({
      branchId: fixture.branchId,
      productId,
      quantity: 9999,
      reason: "Should fail",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("CONFLICT");
  });

  it("adjustStock sets the absolute quantity and records the signed delta", async () => {
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

    const r = await adjustStock({
      branchId: fixture.branchId,
      productId,
      newQuantity: 100,
      reason: "Year-end recount",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.balanceAfter).toBe(100);

    const movement = await testPrisma.inventoryMovement.findFirst({
      where: {
        businessId: fixture.businessId,
        productId,
        type: "ADJUSTMENT",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(movement!.quantityDelta.toNumber()).toBe(100 - startingQty);
    expect(movement!.balanceAfter.toNumber()).toBe(100);
  });

  it("blocks IDOR via cross-tenant branchId", async () => {
    const r = await stockIn({
      branchId: otherTenantBranchId, // belongs to crossFixture
      productId,
      quantity: 10,
      reason: "Attempt",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });

  it("concurrent stockOut requests don't oversell", async () => {
    // Reset to known quantity
    await adjustStock({
      branchId: fixture.branchId,
      productId,
      newQuantity: 10,
      reason: "Reset for concurrency test",
    });

    // Fire 5 parallel stockOuts of 3 each — only 3 should succeed
    // (3 + 3 + 3 = 9 ≤ 10, 4th would push to -2). Postgres
    // serializes inside $transaction so each sees fresh state.
    const results = await Promise.allSettled(
      Array.from({ length: 5 }).map(() =>
        stockOut({
          branchId: fixture.branchId,
          productId,
          quantity: 3,
          reason: "concurrent",
        }),
      ),
    );

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok,
    ).length;
    const failed = results.length - succeeded;

    // Exactly 3 succeed (3×3=9 from 10 starting), 2 fail with CONFLICT
    expect(succeeded).toBe(3);
    expect(failed).toBe(2);

    const final = await testPrisma.inventoryLevel.findUnique({
      where: {
        businessId_branchId_productId: {
          businessId: fixture.businessId,
          branchId: fixture.branchId,
          productId,
        },
      },
    });
    expect(final!.quantity.toNumber()).toBe(1); // 10 - 3×3
    expect(final!.quantity.toNumber()).toBeGreaterThanOrEqual(0);
  });
});
