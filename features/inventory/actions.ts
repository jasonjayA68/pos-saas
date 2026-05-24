"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import {
  fail,
  fromError,
  ok,
  type ActionResult,
} from "@/lib/api/response";
import {
  AdjustStockSchema,
  StockInSchema,
  StockOutSchema,
  type AdjustStockInput,
  type InventoryMovementRow,
  type StockInInput,
  type StockOutInput,
} from "./schemas";

type MovementType =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "SALE"
  | "RETURN"
  | "ADJUSTMENT";

type MovementArgs = {
  businessId: string;
  branchId: string;
  productId: string;
  type: MovementType;
  reason: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  userId: string | null;
  computeNext: (current: number) => number;
};

async function applyMovement(
  args: MovementArgs,
): Promise<{ balanceAfter: number; delta: number }> {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryLevel.findUnique({
      where: {
        businessId_branchId_productId: {
          businessId: args.businessId,
          branchId: args.branchId,
          productId: args.productId,
        },
      },
    });
    const current = existing ? existing.quantity.toNumber() : 0;
    const next = args.computeNext(current);
    if (next < 0) {
      throw new AppError(
        "CONFLICT",
        `Insufficient stock — available: ${current}`,
      );
    }
    const delta = next - current;

    if (existing) {
      await tx.inventoryLevel.update({
        where: { id: existing.id },
        data: { quantity: next },
      });
    } else {
      await tx.inventoryLevel.create({
        data: {
          businessId: args.businessId,
          branchId: args.branchId,
          productId: args.productId,
          quantity: next,
        },
      });
    }

    await tx.inventoryMovement.create({
      data: {
        businessId: args.businessId,
        branchId: args.branchId,
        productId: args.productId,
        type: args.type,
        quantityDelta: delta,
        balanceAfter: next,
        reason: args.reason,
        referenceType: args.referenceType ?? null,
        referenceId: args.referenceId ?? null,
        createdByUserId: args.userId,
      },
    });

    await tx.activityLog.create({
      data: {
        businessId: args.businessId,
        userId: args.userId,
        action: `inventory.${args.type.toLowerCase()}`,
        entityType: "product",
        entityId: args.productId,
        diff: {
          branchId: args.branchId,
          delta,
          balanceAfter: next,
          reason: args.reason,
        },
      },
    });

    return { balanceAfter: next, delta };
  });
}

async function assertOwnership(
  businessId: string,
  branchId: string,
  productId: string,
): Promise<void> {
  const [branch, product] = await Promise.all([
    prisma.branch.findFirst({
      where: { id: branchId, businessId, deletedAt: null },
      select: { id: true },
    }),
    prisma.product.findFirst({
      where: { id: productId, businessId, deletedAt: null },
      select: { id: true },
    }),
  ]);
  if (!branch) throw new AppError("NOT_FOUND", "Branch not found");
  if (!product) throw new AppError("NOT_FOUND", "Product not found");
}

export async function stockIn(
  input: StockInInput,
): Promise<ActionResult<{ balanceAfter: number }>> {
  try {
    const parsed = StockInSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const member = await requirePermission("inventory:update");
    await assertOwnership(
      member.businessId,
      parsed.data.branchId,
      parsed.data.productId,
    );

    const qty = parsed.data.quantity;
    const result = await applyMovement({
      businessId: member.businessId,
      branchId: parsed.data.branchId,
      productId: parsed.data.productId,
      type: "STOCK_IN",
      reason: parsed.data.reason?.trim() || null,
      userId: member.userId,
      computeNext: (current) => current + qty,
    });

    revalidatePath("/inventory");
    return ok({ balanceAfter: result.balanceAfter });
  } catch (err) {
    return fromError(err);
  }
}

export async function stockOut(
  input: StockOutInput,
): Promise<ActionResult<{ balanceAfter: number }>> {
  try {
    const parsed = StockOutSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const member = await requirePermission("inventory:update");
    await assertOwnership(
      member.businessId,
      parsed.data.branchId,
      parsed.data.productId,
    );

    const qty = parsed.data.quantity;
    const result = await applyMovement({
      businessId: member.businessId,
      branchId: parsed.data.branchId,
      productId: parsed.data.productId,
      type: "STOCK_OUT",
      reason: parsed.data.reason.trim(),
      userId: member.userId,
      computeNext: (current) => current - qty,
    });

    revalidatePath("/inventory");
    return ok({ balanceAfter: result.balanceAfter });
  } catch (err) {
    return fromError(err);
  }
}

export async function adjustStock(
  input: AdjustStockInput,
): Promise<ActionResult<{ balanceAfter: number }>> {
  try {
    const parsed = AdjustStockSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const member = await requirePermission("inventory:update");
    await assertOwnership(
      member.businessId,
      parsed.data.branchId,
      parsed.data.productId,
    );

    const target = parsed.data.newQuantity;
    const result = await applyMovement({
      businessId: member.businessId,
      branchId: parsed.data.branchId,
      productId: parsed.data.productId,
      type: "ADJUSTMENT",
      reason: parsed.data.reason.trim(),
      userId: member.userId,
      computeNext: () => target,
    });

    revalidatePath("/inventory");
    return ok({ balanceAfter: result.balanceAfter });
  } catch (err) {
    return fromError(err);
  }
}

export async function getProductMovements(
  productId: string,
): Promise<ActionResult<InventoryMovementRow[]>> {
  try {
    const member = await requirePermission("inventory:read");
    const movements = await prisma.inventoryMovement.findMany({
      where: { businessId: member.businessId, productId },
      include: {
        createdByUser: { select: { fullName: true, email: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return ok(
      movements.map<InventoryMovementRow>((m) => ({
        id: m.id,
        type: m.type,
        delta: m.quantityDelta.toNumber(),
        balance: m.balanceAfter.toNumber(),
        branchName: m.branch.name,
        reason: m.reason,
        userName:
          m.createdByUser?.fullName ||
          m.createdByUser?.email ||
          "System",
        createdAt: m.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    return fromError(err);
  }
}
