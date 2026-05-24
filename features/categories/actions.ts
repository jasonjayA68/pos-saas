"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/dal";
import {
  fail,
  fromError,
  ok,
  type ActionResult,
} from "@/lib/api/response";
import {
  CreateCategorySchema,
  type CreateCategoryInput,
} from "./schemas";

export async function createCategory(
  input: CreateCategoryInput,
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const parsed = CreateCategorySchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const member = await requirePermission("category:create");

    const existing = await prisma.category.findFirst({
      where: {
        businessId: member.businessId,
        name: parsed.data.name,
        deletedAt: null,
      },
    });
    if (existing) {
      return fail(
        "CONFLICT",
        `A category named "${parsed.data.name}" already exists.`,
      );
    }

    const category = await prisma.category.create({
      data: {
        businessId: member.businessId,
        name: parsed.data.name,
      },
    });

    revalidatePath("/products");
    return ok({ id: category.id, name: category.name });
  } catch (err) {
    return fromError(err);
  }
}

export async function deleteCategory(
  id: string,
): Promise<ActionResult<true>> {
  try {
    const member = await requirePermission("category:delete");
    const existing = await prisma.category.findFirst({
      where: {
        id,
        businessId: member.businessId,
        deletedAt: null,
      },
    });
    if (!existing) return fail("NOT_FOUND", "Category not found");

    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/products");
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}
