"use server";
import "server-only";
import { randomBytes } from "node:crypto";
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
  CreateSaleSchema,
  type CreateSaleInput,
} from "./schemas";
import { getReceiptData, type ReceiptData } from "./queries";

export async function fetchReceiptData(
  saleId: string,
): Promise<ActionResult<ReceiptData>> {
  try {
    const data = await getReceiptData(saleId);
    if (!data) return fail("NOT_FOUND", "Sale not found");
    return ok(data);
  } catch (err) {
    return fromError(err);
  }
}

function generateReceiptNumber(): string {
  const now = new Date();
  const date =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `OR-${date}-${suffix}`;
}

export async function createSale(
  input: CreateSaleInput,
): Promise<ActionResult<{ saleId: string; receiptNumber: string }>> {
  try {
    const parsed = CreateSaleSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const member = await requirePermission("sale:create");
    const data = parsed.data;

    // Idempotency: if a sale with this key already exists, just return it.
    const existing = await prisma.sale.findUnique({
      where: {
        businessId_idempotencyKey: {
          businessId: member.businessId,
          idempotencyKey: data.idempotencyKey,
        },
      },
      select: { id: true, receiptNumber: true },
    });
    if (existing) {
      return ok({
        saleId: existing.id,
        receiptNumber: existing.receiptNumber,
      });
    }

    // Verify branch belongs to this business.
    const branch = await prisma.branch.findFirst({
      where: {
        id: data.branchId,
        businessId: member.businessId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!branch) return fail("NOT_FOUND", "Branch not found");

    // Load products (canonical prices and tax rates come from DB, never client).
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId: member.businessId,
        deletedAt: null,
        isActive: true,
      },
    });
    if (products.length !== productIds.length) {
      return fail(
        "NOT_FOUND",
        "Some products are unavailable. Remove them from the cart and try again.",
      );
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Compute totals server-side.
    type LineRecord = {
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      unitPriceCentavos: number;
      taxCentavos: number;
      totalCentavos: number;
      trackInventory: boolean;
    };

    const lines: LineRecord[] = [];
    let subtotalCentavos = 0;
    let taxCentavos = 0;

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return fail("NOT_FOUND", `Product ${item.productId} not available.`);
      }
      const lineSubtotal = Math.round(item.quantity * product.priceCentavos);
      const lineTax = Math.round(
        (lineSubtotal * product.taxRateBps) / 10000,
      );
      const lineTotal = lineSubtotal + lineTax;
      subtotalCentavos += lineSubtotal;
      taxCentavos += lineTax;
      lines.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPriceCentavos: product.priceCentavos,
        taxCentavos: lineTax,
        totalCentavos: lineTotal,
        trackInventory: product.trackInventory,
      });
    }

    const cartDiscount = Math.min(data.discountCentavos, subtotalCentavos);
    const totalCentavos = subtotalCentavos - cartDiscount + taxCentavos;

    // Payment validation.
    let amountPaid = data.amountPaidCentavos;
    if (data.paymentMethod === "CASH") {
      if (amountPaid < totalCentavos) {
        return fail(
          "VALIDATION",
          `Amount paid is less than total (₱${(totalCentavos / 100).toFixed(2)}).`,
        );
      }
    } else {
      amountPaid = totalCentavos;
    }
    const changeCentavos = Math.max(0, amountPaid - totalCentavos);

    const receiptNumber = generateReceiptNumber();

    const sale = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          businessId: member.businessId,
          branchId: data.branchId,
          customerId: data.customerId ?? null,
          cashierUserId: member.userId,
          receiptNumber,
          subtotalCentavos,
          discountCentavos: cartDiscount,
          taxCentavos,
          totalCentavos,
          amountPaidCentavos: amountPaid,
          changeCentavos,
          paymentMethod: data.paymentMethod,
          paymentStatus: "PAID",
          idempotencyKey: data.idempotencyKey,
          notes: data.notes ?? null,
          items: {
            create: lines.map((l) => ({
              businessId: member.businessId,
              productId: l.productId,
              productName: l.productName,
              productSku: l.productSku,
              quantity: l.quantity,
              unitPriceCentavos: l.unitPriceCentavos,
              discountCentavos: 0,
              taxCentavos: l.taxCentavos,
              totalCentavos: l.totalCentavos,
            })),
          },
        },
      });

      // Deduct inventory atomically per tracked item.
      for (const line of lines) {
        if (!line.trackInventory) continue;

        const existingLevel = await tx.inventoryLevel.findUnique({
          where: {
            businessId_branchId_productId: {
              businessId: member.businessId,
              branchId: data.branchId,
              productId: line.productId,
            },
          },
        });
        const current = existingLevel
          ? existingLevel.quantity.toNumber()
          : 0;
        const next = current - line.quantity;

        if (next < 0) {
          throw new AppError(
            "CONFLICT",
            `Insufficient stock for ${line.productName} — available ${current}, requested ${line.quantity}.`,
          );
        }

        if (existingLevel) {
          await tx.inventoryLevel.update({
            where: { id: existingLevel.id },
            data: { quantity: next },
          });
        } else {
          await tx.inventoryLevel.create({
            data: {
              businessId: member.businessId,
              branchId: data.branchId,
              productId: line.productId,
              quantity: next,
            },
          });
        }

        await tx.inventoryMovement.create({
          data: {
            businessId: member.businessId,
            branchId: data.branchId,
            productId: line.productId,
            type: "SALE",
            quantityDelta: -line.quantity,
            balanceAfter: next,
            reason: `Sale ${receiptNumber}`,
            referenceType: "sale",
            referenceId: createdSale.id,
            createdByUserId: member.userId,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          businessId: member.businessId,
          userId: member.userId,
          action: "sale.created",
          entityType: "sale",
          entityId: createdSale.id,
          diff: {
            receiptNumber,
            total: totalCentavos,
            items: lines.length,
            paymentMethod: data.paymentMethod,
          },
        },
      });

      return createdSale;
    });

    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return ok({
      saleId: sale.id,
      receiptNumber: sale.receiptNumber,
    });
  } catch (err) {
    return fromError(err);
  }
}
