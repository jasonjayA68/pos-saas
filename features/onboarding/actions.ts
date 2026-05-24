"use server";
import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { verifySession } from "@/lib/auth/dal";
import { setActiveBusiness } from "@/lib/tenant/context";
import {
  fromError,
  ok,
  fail,
  type ActionResult,
} from "@/lib/api/response";
import {
  OnboardingInputSchema,
  type OnboardingInput,
} from "@/features/onboarding/schemas";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function randomSuffix(): string {
  return randomBytes(3).toString("hex");
}

function nullableString(v?: string): string | null {
  const trimmed = v?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function ensureUserBusiness(
  input: OnboardingInput,
): Promise<ActionResult<{ businessId: string }>> {
  try {
    const parsed = OnboardingInputSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const data = parsed.data;

    const session = await verifySession();

    const existing = await prisma.businessMember.findFirst({
      where: { userId: session.userId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (existing) {
      await setActiveBusiness(existing.businessId);
      return ok({ businessId: existing.businessId });
    }

    const ownerRole = await prisma.role.findFirst({
      where: { businessId: null, name: "owner", isSystem: true },
    });
    if (!ownerRole) {
      return fail(
        "INTERNAL",
        'System role "owner" is missing. Run `npm run db:seed`.',
      );
    }

    const slug = `${slugify(data.businessName) || "business"}-${randomSuffix()}`;

    const business = await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: session.userId },
        update: { fullName: data.fullName },
        create: {
          id: session.userId,
          email: session.email,
          fullName: data.fullName,
        },
      });

      const created = await tx.business.create({
        data: {
          name: data.businessName,
          slug,
          ownerUserId: session.userId,
          businessType: data.businessType,
          phone: data.phone,
          email: nullableString(data.email),
          addressLine1: data.addressLine1,
          addressLine2: nullableString(data.addressLine2),
          city: data.city,
          province: data.province,
          postalCode: nullableString(data.postalCode),
          taxId: nullableString(data.taxId),
          vatRegistered: data.vatRegistered,
          receiptHeader: nullableString(data.receiptHeader),
          receiptFooter: nullableString(data.receiptFooter),
        },
      });

      await tx.branch.create({
        data: {
          businessId: created.id,
          name: "Main",
          isDefault: true,
          address: [
            data.addressLine1,
            nullableString(data.addressLine2),
            data.city,
            data.province,
          ]
            .filter(Boolean)
            .join(", "),
        },
      });

      await tx.businessMember.create({
        data: {
          businessId: created.id,
          userId: session.userId,
          roleId: ownerRole.id,
        },
      });

      return created;
    });

    await setActiveBusiness(business.id);
    return ok({ businessId: business.id });
  } catch (err) {
    return fromError(err);
  }
}
