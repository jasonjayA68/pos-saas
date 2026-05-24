"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { verifyPlatformAdmin } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import {
  fail,
  fromError,
  ok,
  type ActionResult,
} from "@/lib/api/response";
import { uploadBillingAsset } from "@/lib/storage/payment-proofs";
import {
  ApprovePaymentSchema,
  RejectPaymentSchema,
  UpdateBillingSettingsSchema,
  type ApprovePaymentInput,
  type RejectPaymentInput,
  type UpdateBillingSettingsInput,
} from "./schemas";
import { getAdminPaymentSignedProofUrl } from "./admin-queries";

export async function getAdminProofUrl(
  paymentId: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    const url = await getAdminPaymentSignedProofUrl(paymentId);
    if (!url) return fail("NOT_FOUND", "No proof attached to this payment");
    return ok({ url });
  } catch (err) {
    return fromError(err);
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addInterval(
  start: Date,
  interval: "MONTHLY" | "YEARLY",
): Date {
  const end = new Date(start);
  if (interval === "MONTHLY") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end;
}

export async function approvePayment(
  input: ApprovePaymentInput,
): Promise<ActionResult<{ subscriptionId: string }>> {
  try {
    const admin = await verifyPlatformAdmin();
    const parsed = ApprovePaymentSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.subscriptionPayment.findUnique({
        where: { id: parsed.data.paymentId },
        include: { plan: true },
      });
      if (!payment) {
        throw new AppError("NOT_FOUND", "Payment not found");
      }
      if (payment.status !== "PENDING") {
        throw new AppError(
          "CONFLICT",
          `Payment is already ${payment.status.toLowerCase()}`,
        );
      }

      // Approve the payment.
      await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedByUserId: admin.userId,
          reviewerNote: parsed.data.reviewerNote,
        },
      });

      // Activate / extend the subscription. If the business already has an
      // active period in the future, extend from its end; otherwise start now.
      const existing = await tx.subscription.findUnique({
        where: { businessId: payment.businessId },
      });

      const now = new Date();
      const start =
        existing &&
        (existing.status === "ACTIVE" || existing.status === "TRIALING") &&
        existing.currentPeriodEnd > now
          ? existing.currentPeriodEnd
          : now;
      const end = addInterval(start, payment.plan.billingInterval);

      const upserted = await tx.subscription.upsert({
        where: { businessId: payment.businessId },
        update: {
          planId: payment.planId,
          status: "ACTIVE",
          currentPeriodStart: start,
          currentPeriodEnd: end,
          canceledAt: null,
        },
        create: {
          businessId: payment.businessId,
          planId: payment.planId,
          status: "ACTIVE",
          currentPeriodStart: start,
          currentPeriodEnd: end,
        },
      });

      await tx.activityLog.create({
        data: {
          businessId: payment.businessId,
          userId: admin.userId,
          action: "subscription_payment.approve",
          entityType: "subscription_payment",
          entityId: payment.id,
          diff: {
            planCode: payment.plan.code,
            newPeriodEnd: end.toISOString(),
          },
        },
      });

      return { subscriptionId: upserted.id };
    });

    revalidatePath("/admin/payments");
    revalidatePath("/billing");
    return ok(result);
  } catch (err) {
    return fromError(err);
  }
}

export async function rejectPayment(
  input: RejectPaymentInput,
): Promise<ActionResult<{ paymentId: string }>> {
  try {
    const admin = await verifyPlatformAdmin();
    const parsed = RejectPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Provide a reason (3–500 chars).",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: parsed.data.paymentId },
      select: { businessId: true, status: true },
    });
    if (!payment) return fail("NOT_FOUND", "Payment not found");
    if (payment.status !== "PENDING") {
      return fail("CONFLICT", `Payment is already ${payment.status.toLowerCase()}`);
    }

    await prisma.subscriptionPayment.update({
      where: { id: parsed.data.paymentId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByUserId: admin.userId,
        rejectionReason: parsed.data.rejectionReason,
      },
    });

    await prisma.activityLog.create({
      data: {
        businessId: payment.businessId,
        userId: admin.userId,
        action: "subscription_payment.reject",
        entityType: "subscription_payment",
        entityId: parsed.data.paymentId,
        diff: { reason: parsed.data.rejectionReason },
      },
    });

    revalidatePath("/admin/payments");
    revalidatePath("/billing");
    return ok({ paymentId: parsed.data.paymentId });
  } catch (err) {
    return fromError(err);
  }
}

export async function updateBillingSettings(
  input: UpdateBillingSettingsInput,
): Promise<ActionResult<{ updatedAtIso: string }>> {
  try {
    await verifyPlatformAdmin();
    const parsed = UpdateBillingSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid fields",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    // Coerce undefined → keep, null → clear, string → set.
    const data = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    );

    const row = await prisma.platformBillingSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });

    revalidatePath("/admin/billing-settings");
    revalidatePath("/billing");
    return ok({ updatedAtIso: row.updatedAt.toISOString() });
  } catch (err) {
    return fromError(err);
  }
}

export async function uploadBillingQrAction(
  formData: FormData,
): Promise<ActionResult<{ url: string; kind: "gcash-qr" | "maya-qr" }>> {
  try {
    await verifyPlatformAdmin();
    const kindRaw = formData.get("kind");
    const file = formData.get("file");
    if (kindRaw !== "gcash-qr" && kindRaw !== "maya-qr") {
      return fail("VALIDATION", "Invalid kind");
    }
    if (!(file instanceof File) || file.size === 0) {
      return fail("VALIDATION", "No file");
    }
    if (file.size > 2 * 1024 * 1024) {
      return fail("VALIDATION", "QR image must be under 2 MB");
    }
    if (!file.type.startsWith("image/")) {
      return fail("VALIDATION", "QR image must be an image file");
    }

    const url = await uploadBillingAsset({
      kind: kindRaw,
      filename: file.name || "qr",
      contentType: file.type,
      body: await file.arrayBuffer(),
    });

    const field = kindRaw === "gcash-qr" ? "gcashQrUrl" : "mayaQrUrl";
    await prisma.platformBillingSettings.upsert({
      where: { id: "singleton" },
      update: { [field]: url },
      create: { id: "singleton", [field]: url },
    });

    revalidatePath("/admin/billing-settings");
    revalidatePath("/billing");
    return ok({ url, kind: kindRaw });
  } catch (err) {
    return fromError(err);
  }
}
