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
  ALLOWED_PROOF_MIME_TYPES,
  MAX_PROOF_BYTES,
  getSignedProofUrl,
  uploadPaymentProof,
} from "@/lib/storage/payment-proofs";
import {
  rateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import { SubmitPaymentSchema } from "./schemas";
import {
  getMyPaymentProof,
  hasPendingPaymentForPlan,
} from "./queries";

export async function getMyProofUrl(
  paymentId: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    const proof = await getMyPaymentProof(paymentId);
    if (!proof) return fail("NOT_FOUND", "No proof attached");
    const url = await getSignedProofUrl(proof.storagePath, 60 * 5);
    return ok({ url });
  } catch (err) {
    return fromError(err);
  }
}

type SubmitResult = { paymentId: string };

// Accepts FormData so we can stream the proof file without a separate
// /api/upload endpoint. Validates fields with Zod, uploads the proof to the
// private bucket, then commits the payment row in PENDING. If the upload
// fails after the row is created, we roll back the row so we don't leave
// orphaned PENDING entries.
export async function submitPayment(
  formData: FormData,
): Promise<ActionResult<SubmitResult>> {
  try {
    const member = await requirePermission("billing:update");

    // 10 submissions per business owner per hour. The admin queue is
    // reviewed manually, so unbounded submissions are an abuse vector
    // (storage bloat + reviewer DoS).
    const rl = rateLimit(
      `payment-submit:${member.userId}`,
      10,
      60 * 60 * 1000,
    );
    if (!rl.ok) {
      return fail(
        "RATE_LIMITED",
        rateLimitMessage(rl, "payment submissions"),
      );
    }

    const proofFile = formData.get("proof");
    const hasProof = proofFile instanceof File && proofFile.size > 0;

    const parsed = SubmitPaymentSchema.safeParse({
      planCode: formData.get("planCode"),
      method: formData.get("method"),
      amountCentavos: formData.get("amountCentavos"),
      referenceNumber: formData.get("referenceNumber") ?? undefined,
      notes: formData.get("notes") ?? undefined,
      proofPresent: hasProof,
    });
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Please fix the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    const input = parsed.data;

    if (hasProof) {
      const file = proofFile as File;
      if (file.size > MAX_PROOF_BYTES) {
        return fail("VALIDATION", "Proof file is larger than 5 MB.");
      }
      if (
        !ALLOWED_PROOF_MIME_TYPES.includes(
          file.type as (typeof ALLOWED_PROOF_MIME_TYPES)[number],
        )
      ) {
        return fail(
          "VALIDATION",
          "Proof must be a PNG, JPEG, WEBP, or PDF file.",
        );
      }
    }

    const plan = await prisma.plan.findUnique({
      where: { code: input.planCode },
    });
    if (!plan || !plan.isActive) {
      return fail("NOT_FOUND", "That plan is not available.");
    }

    if (await hasPendingPaymentForPlan(member.businessId, plan.id)) {
      return fail(
        "CONFLICT",
        "You already have a pending payment for this plan. Wait for it to be reviewed before submitting another.",
      );
    }

    // Create the row first so we have an ID for the storage path.
    const payment = await prisma.subscriptionPayment.create({
      data: {
        businessId: member.businessId,
        planId: plan.id,
        submittedByUserId: member.userId,
        method: input.method,
        amountCentavos: input.amountCentavos,
        referenceNumber: input.referenceNumber,
        notes: input.notes,
        status: "PENDING",
      },
      select: { id: true },
    });

    if (hasProof) {
      const file = proofFile as File;
      try {
        const storagePath = await uploadPaymentProof({
          businessId: member.businessId,
          paymentId: payment.id,
          filename: file.name || "proof",
          contentType: file.type,
          body: await file.arrayBuffer(),
        });
        await prisma.subscriptionPayment.update({
          where: { id: payment.id },
          data: { proofStoragePath: storagePath, proofMimeType: file.type },
        });
      } catch (err) {
        // Roll back the orphaned PENDING row so the user can retry cleanly.
        await prisma.subscriptionPayment
          .delete({ where: { id: payment.id } })
          .catch(() => {});
        throw err;
      }
    }

    await prisma.activityLog.create({
      data: {
        businessId: member.businessId,
        userId: member.userId,
        action: "subscription_payment.submit",
        entityType: "subscription_payment",
        entityId: payment.id,
        diff: {
          planCode: plan.code,
          method: input.method,
          amountCentavos: input.amountCentavos,
        },
      },
    });

    revalidatePath("/billing");
    return ok({ paymentId: payment.id });
  } catch (err) {
    return fromError(err);
  }
}
