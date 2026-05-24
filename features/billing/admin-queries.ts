import "server-only";
import { prisma } from "@/lib/db/client";
import { verifyPlatformAdmin } from "@/lib/auth/dal";
import { getSignedProofUrl } from "@/lib/storage/payment-proofs";

export type AdminPaymentRow = {
  id: string;
  businessId: string;
  businessName: string;
  planCode: string;
  planName: string;
  planPriceCentavos: number;
  billingInterval: "MONTHLY" | "YEARLY";
  submittedByName: string;
  submittedByEmail: string;
  method: string;
  amountCentavos: number;
  referenceNumber: string | null;
  notes: string | null;
  proofStoragePath: string | null;
  proofMimeType: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  reviewerNote: string | null;
  reviewedByName: string | null;
  reviewedAtIso: string | null;
  createdAtIso: string;
};

export async function listAdminPayments(opts?: {
  status?: "PENDING" | "APPROVED" | "REJECTED" | "ALL";
}): Promise<AdminPaymentRow[]> {
  await verifyPlatformAdmin();

  const status = opts?.status ?? "PENDING";
  const where =
    status === "ALL" ? {} : { status: status as "PENDING" | "APPROVED" | "REJECTED" };

  const payments = await prisma.subscriptionPayment.findMany({
    where,
    include: {
      business: { select: { id: true, name: true } },
      plan: {
        select: {
          code: true,
          name: true,
          priceCentavos: true,
          billingInterval: true,
        },
      },
      submittedBy: { select: { fullName: true, email: true } },
      reviewedByUser: { select: { fullName: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return payments.map<AdminPaymentRow>((p) => ({
    id: p.id,
    businessId: p.business.id,
    businessName: p.business.name,
    planCode: p.plan.code,
    planName: p.plan.name,
    planPriceCentavos: p.plan.priceCentavos,
    billingInterval: p.plan.billingInterval,
    submittedByName: p.submittedBy.fullName || p.submittedBy.email || "—",
    submittedByEmail: p.submittedBy.email,
    method: p.method,
    amountCentavos: p.amountCentavos,
    referenceNumber: p.referenceNumber,
    notes: p.notes,
    proofStoragePath: p.proofStoragePath,
    proofMimeType: p.proofMimeType,
    status: p.status,
    rejectionReason: p.rejectionReason,
    reviewerNote: p.reviewerNote,
    reviewedByName:
      p.reviewedByUser?.fullName || p.reviewedByUser?.email || null,
    reviewedAtIso: p.reviewedAt?.toISOString() ?? null,
    createdAtIso: p.createdAt.toISOString(),
  }));
}

export async function getAdminPaymentSignedProofUrl(
  paymentId: string,
): Promise<string | null> {
  await verifyPlatformAdmin();
  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    select: { proofStoragePath: true },
  });
  if (!payment?.proofStoragePath) return null;
  return getSignedProofUrl(payment.proofStoragePath, 60 * 30);
}

export type AdminBillingSettings = {
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
  updatedAtIso: string | null;
};

export async function getAdminBillingSettings(): Promise<AdminBillingSettings> {
  await verifyPlatformAdmin();
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
      updatedAtIso: null,
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
    updatedAtIso: row.updatedAt.toISOString(),
  };
}

export type AdminDashboardStats = {
  pendingPayments: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  activeBusinesses: number;
  trialingBusinesses: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await verifyPlatformAdmin();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pending, approvedThisMonth, rejectedThisMonth, active, trialing] =
    await Promise.all([
      prisma.subscriptionPayment.count({ where: { status: "PENDING" } }),
      prisma.subscriptionPayment.count({
        where: { status: "APPROVED", reviewedAt: { gte: startOfMonth } },
      }),
      prisma.subscriptionPayment.count({
        where: { status: "REJECTED", reviewedAt: { gte: startOfMonth } },
      }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "TRIALING" } }),
    ]);

  return {
    pendingPayments: pending,
    approvedThisMonth,
    rejectedThisMonth,
    activeBusinesses: active,
    trialingBusinesses: trialing,
  };
}
