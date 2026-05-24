"use server";
import "server-only";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/dal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import { generateSku } from "@/lib/sku";
import {
  fail,
  fromError,
  ok,
  type ActionResult,
} from "@/lib/api/response";
import {
  CreateProductSchema,
  UpdateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "./schemas";

function nullable(s?: string): string | null {
  const trimmed = s?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

async function ensureSku(
  businessId: string,
  sku: string | undefined,
  name: string,
  excludeId?: string,
): Promise<string> {
  const userProvided = nullable(sku);
  let candidate = userProvided ?? generateSku(name);
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.product.findUnique({
      where: { businessId_sku: { businessId, sku: candidate } },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    if (userProvided) {
      throw new AppError(
        "CONFLICT",
        `SKU "${candidate}" is already in use.`,
      );
    }
    candidate = generateSku(name);
  }
  throw new AppError(
    "CONFLICT",
    "Couldn't generate a unique SKU. Please enter one manually.",
  );
}

export async function createProduct(
  input: CreateProductInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateProductSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const member = await requirePermission("product:create");
    const data = parsed.data;

    const sku = await ensureSku(member.businessId, data.sku, data.name);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          businessId: member.businessId,
          categoryId: nullable(data.categoryId),
          name: data.name,
          sku,
          barcode: nullable(data.barcode),
          description: nullable(data.description),
          priceCentavos: Math.round(data.price * 100),
          costCentavos: Math.round(data.cost * 100),
          unit: data.unit || "piece",
          imageUrl: nullable(data.imageUrl),
          trackInventory: data.trackInventory,
          isActive: data.isActive,
        },
      });

      await tx.activityLog.create({
        data: {
          businessId: member.businessId,
          userId: member.userId,
          action: "product.created",
          entityType: "product",
          entityId: created.id,
          diff: { name: data.name, sku, price: data.price },
        },
      });

      return created;
    });

    revalidatePath("/products");
    revalidatePath("/inventory");
    return ok({ id: product.id });
  } catch (err) {
    return fromError(err);
  }
}

export async function updateProduct(
  input: UpdateProductInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = UpdateProductSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const member = await requirePermission("product:update");
    const data = parsed.data;

    const existing = await prisma.product.findFirst({
      where: {
        id: data.id,
        businessId: member.businessId,
        deletedAt: null,
      },
    });
    if (!existing) return fail("NOT_FOUND", "Product not found");

    const sku = await ensureSku(
      member.businessId,
      data.sku,
      data.name,
      existing.id,
    );

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          categoryId: nullable(data.categoryId),
          name: data.name,
          sku,
          barcode: nullable(data.barcode),
          description: nullable(data.description),
          priceCentavos: Math.round(data.price * 100),
          costCentavos: Math.round(data.cost * 100),
          unit: data.unit || "piece",
          imageUrl: nullable(data.imageUrl),
          trackInventory: data.trackInventory,
          isActive: data.isActive,
        },
      });

      await tx.activityLog.create({
        data: {
          businessId: member.businessId,
          userId: member.userId,
          action: "product.updated",
          entityType: "product",
          entityId: existing.id,
          diff: { name: data.name, sku, price: data.price },
        },
      });
    });

    revalidatePath("/products");
    revalidatePath("/inventory");
    return ok({ id: existing.id });
  } catch (err) {
    return fromError(err);
  }
}

export async function archiveProduct(
  id: string,
): Promise<ActionResult<{ isActive: boolean }>> {
  try {
    const member = await requirePermission("product:update");
    const existing = await prisma.product.findFirst({
      where: { id, businessId: member.businessId, deletedAt: null },
    });
    if (!existing) return fail("NOT_FOUND", "Product not found");

    const next = !existing.isActive;
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isActive: next },
      });
      await tx.activityLog.create({
        data: {
          businessId: member.businessId,
          userId: member.userId,
          action: next ? "product.unarchived" : "product.archived",
          entityType: "product",
          entityId: id,
          diff: { isActive: next },
        },
      });
    });

    revalidatePath("/products");
    return ok({ isActive: next });
  } catch (err) {
    return fromError(err);
  }
}

export async function deleteProduct(
  id: string,
): Promise<ActionResult<true>> {
  try {
    const member = await requirePermission("product:delete");
    const existing = await prisma.product.findFirst({
      where: { id, businessId: member.businessId, deletedAt: null },
    });
    if (!existing) return fail("NOT_FOUND", "Product not found");

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await tx.activityLog.create({
        data: {
          businessId: member.businessId,
          userId: member.userId,
          action: "product.deleted",
          entityType: "product",
          entityId: id,
          diff: { name: existing.name, sku: existing.sku },
        },
      });
    });

    revalidatePath("/products");
    revalidatePath("/inventory");
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}

export async function uploadProductImage(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const member = await requirePermission("product:update");
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return fail("VALIDATION", "No file provided");
    }
    if (file.size > 4 * 1024 * 1024) {
      return fail("VALIDATION", "Image must be under 4 MB");
    }
    if (!file.type.startsWith("image/")) {
      return fail("VALIDATION", "File must be an image");
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
    const filename = `${randomBytes(8).toString("hex")}.${safeExt}`;
    const path = `${member.businessId}/${filename}`;

    const supabase = createSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      return fail(
        "INTERNAL",
        `Upload failed: ${uploadError.message}. Make sure the "product-images" bucket exists and is public.`,
      );
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);
    return ok({ url: data.publicUrl });
  } catch (err) {
    return fromError(err);
  }
}
