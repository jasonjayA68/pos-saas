import "server-only";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { getSubscriptionGate, type SubscriptionGate } from "@/lib/billing/guard";

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  billingInterval: "MONTHLY" | "YEARLY";
  maxUsers: number;
  maxProducts: number;
  maxBranches: number;
  features: Record<string, boolean>;
};

export async function listActivePlans(): Promise<PlanRow[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { priceCentavos: "asc" },
  });
  return plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    priceCentavos: p.priceCentavos,
    billingInterval: p.billingInterval,
    maxUsers: p.maxUsers,
    maxProducts: p.maxProducts,
    maxBranches: p.maxBranches,
    features:
      typeof p.features === "object" && p.features !== null && !Array.isArray(p.features)
        ? (p.features as Record<string, boolean>)
        : {},
  }));
}

export async function getPlanByCode(code: string): Promise<PlanRow | null> {
  const plan = await prisma.plan.findUnique({ where: { code } });
  if (!plan || !plan.isActive) return null;
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    priceCentavos: plan.priceCentavos,
    billingInterval: plan.billingInterval,
    maxUsers: plan.maxUsers,
    maxProducts: plan.maxProducts,
    maxBranches: plan.maxBranches,
    features:
      typeof plan.features === "object" && plan.features !== null && !Array.isArray(plan.features)
        ? (plan.features as Record<string, boolean>)
        : {},
  };
}

export async function getMySubscriptionGate(): Promise<SubscriptionGate> {
  const member = await requirePermission("billing:read");
  return getSubscriptionGate(member.businessId);
}

export type PublicBillingSettings = {
  gcashAccountName: string | null;
  gcashAccountNumber: string | null;
  gcashQrUrl: string | null;
  mayaAccountName: string | null;
  mayaAccountNumber: string | null;
  mayaQrUrl: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankBranch: string | null;
  instructions: string | null;
};

export async function getPublicBillingSettings(): Promise<PublicBillingSettings> {
  await requirePermission("billing:read");
  const row = await prisma.platformBillingSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return {
      gcashAccountName: null,
      gcashAccountNumber: null,
      gcashQrUrl: null,
      mayaAccountName: null,
      mayaAccountNumber: null,
      mayaQrUrl: null,
      bankName: null,
      bankAccountName: null,
      bankAccountNumber: null,
      bankBranch: null,
      instructions: null,
    };
  }
  return {
    gcashAccountName: row.gcashAccountName,
    gcashAccountNumber: row.gcashAccountNumber,
    gcashQrUrl: row.gcashQrUrl,
    mayaAccountName: row.mayaAccountName,
    mayaAccountNumber: row.mayaAccountNumber,
    mayaQrUrl: row.mayaQrUrl,
    bankName: row.bankName,
    bankAccountName: row.bankAccountName,
    bankAccountNumber: row.bankAccountNumber,
    bankBranch: row.bankBranch,
    instructions: row.instructions,
  };
}

export type MyPaymentRow = {
  id: string;
  planCode: string;
  planName: string;
  method: string;
  amountCentavos: number;
  referenceNumber: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewerNote: string | null;
  rejectionReason: string | null;
  createdAtIso: string;
  reviewedAtIso: string | null;
};

export async function listMyPayments(): Promise<MyPaymentRow[]> {
  const member = await requirePermission("billing:read");
  const payments = await prisma.subscriptionPayment.findMany({
    where: { businessId: member.businessId },
    include: { plan: { select: { code: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return payments.map((p) => ({
    id: p.id,
    planCode: p.plan.code,
    planName: p.plan.name,
    method: p.method,
    amountCentavos: p.amountCentavos,
    referenceNumber: p.referenceNumber,
    status: p.status,
    reviewerNote: p.reviewerNote,
    rejectionReason: p.rejectionReason,
    createdAtIso: p.createdAt.toISOString(),
    reviewedAtIso: p.reviewedAt?.toISOString() ?? null,
  }));
}

export async function hasPendingPaymentForPlan(
  businessId: string,
  planId: string,
): Promise<boolean> {
  const existing = await prisma.subscriptionPayment.findFirst({
    where: { businessId, planId, status: "PENDING" },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function assertBillingAccess(): Promise<void> {
  await requirePermission("billing:read");
}

// Used by /api/billing/proof/[paymentId] route handler.
export async function getMyPaymentProof(
  paymentId: string,
): Promise<{ storagePath: string; mimeType: string | null } | null> {
  const member = await requirePermission("billing:read");
  const payment = await prisma.subscriptionPayment.findFirst({
    where: { id: paymentId, businessId: member.businessId },
    select: { proofStoragePath: true, proofMimeType: true },
  });
  if (!payment?.proofStoragePath) return null;
  return {
    storagePath: payment.proofStoragePath,
    mimeType: payment.proofMimeType,
  };
}

export { getSubscriptionGate };
export type { SubscriptionGate };
