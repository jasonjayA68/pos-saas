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
import {
  ChangeTenantPlanSchema,
  DeleteTenantSchema,
  ExtendSubscriptionSchema,
  ReactivateTenantSchema,
  ResetTenantTrialSchema,
  SuspendTenantSchema,
  type ChangeTenantPlanInput,
  type DeleteTenantInput,
  type ExtendSubscriptionInput,
  type ReactivateTenantInput,
  type ResetTenantTrialInput,
  type SuspendTenantInput,
} from "./schemas";

const DAY_MS = 24 * 60 * 60 * 1000;

function revalidateTenant(businessId: string): void {
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${businessId}`);
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/analytics");
  revalidatePath("/admin");
}

// SUSPEND — sets subscription to CANCELED, records canceledAt. The
// existing subscription gate blocks the tenant from accessing anything
// other than /billing/* with reason="canceled".
export async function suspendTenant(
  input: SuspendTenantInput,
): Promise<ActionResult<true>> {
  try {
    const admin = await verifyPlatformAdmin();
    const parsed = SuspendTenantSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "Invalid input");

    const sub = await prisma.subscription.findUnique({
      where: { businessId: parsed.data.businessId },
      select: { id: true, status: true },
    });
    if (!sub) return fail("NOT_FOUND", "Subscription not found for this tenant");
    if (sub.status === "CANCELED") {
      return fail("CONFLICT", "Tenant is already suspended");
    }

    await prisma.subscription.update({
      where: { businessId: parsed.data.businessId },
      data: { status: "CANCELED", canceledAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        businessId: parsed.data.businessId,
        userId: admin.userId,
        action: "admin.tenant.suspend",
        entityType: "subscription",
        entityId: sub.id,
        diff: { reason: parsed.data.reason ?? null },
      },
    });

    revalidateTenant(parsed.data.businessId);
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}

// REACTIVATE — flips CANCELED/EXPIRED back to ACTIVE. Leaves the period
// untouched; admin can `extendSubscription` separately if needed.
export async function reactivateTenant(
  input: ReactivateTenantInput,
): Promise<ActionResult<true>> {
  try {
    const admin = await verifyPlatformAdmin();
    const parsed = ReactivateTenantSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "Invalid input");

    const sub = await prisma.subscription.findUnique({
      where: { businessId: parsed.data.businessId },
      select: { id: true, status: true, currentPeriodEnd: true },
    });
    if (!sub) return fail("NOT_FOUND", "Subscription not found");

    await prisma.subscription.update({
      where: { businessId: parsed.data.businessId },
      data: { status: "ACTIVE", canceledAt: null },
    });

    await prisma.activityLog.create({
      data: {
        businessId: parsed.data.businessId,
        userId: admin.userId,
        action: "admin.tenant.reactivate",
        entityType: "subscription",
        entityId: sub.id,
        diff: { previousStatus: sub.status },
      },
    });

    revalidateTenant(parsed.data.businessId);
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}

// EXTEND — pushes currentPeriodEnd forward by `days`. If the period
// already ended, the new end starts from now (rather than extending into
// the past, which would still keep them blocked).
export async function extendSubscription(
  input: ExtendSubscriptionInput,
): Promise<ActionResult<{ newPeriodEnd: string }>> {
  try {
    const admin = await verifyPlatformAdmin();
    const parsed = ExtendSubscriptionSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Days must be between 1 and 365",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    const sub = await prisma.subscription.findUnique({
      where: { businessId: parsed.data.businessId },
      select: { id: true, currentPeriodEnd: true, status: true },
    });
    if (!sub) return fail("NOT_FOUND", "Subscription not found");

    const now = new Date();
    const baseline =
      sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
    const newEnd = new Date(baseline.getTime() + parsed.data.days * DAY_MS);

    await prisma.subscription.update({
      where: { businessId: parsed.data.businessId },
      data: {
        currentPeriodEnd: newEnd,
        // If the period had lapsed (EXPIRED), bring them back into ACTIVE.
        ...(sub.status === "EXPIRED"
          ? { status: "ACTIVE" as const }
          : {}),
      },
    });

    await prisma.activityLog.create({
      data: {
        businessId: parsed.data.businessId,
        userId: admin.userId,
        action: "admin.subscription.extend",
        entityType: "subscription",
        entityId: sub.id,
        diff: {
          days: parsed.data.days,
          newPeriodEnd: newEnd.toISOString(),
          reason: parsed.data.reason ?? null,
        },
      },
    });

    revalidateTenant(parsed.data.businessId);
    return ok({ newPeriodEnd: newEnd.toISOString() });
  } catch (err) {
    return fromError(err);
  }
}

// CHANGE PLAN — swaps planId; optionally resets the period to start
// fresh from today (useful for upgrades).
export async function changeTenantPlan(
  input: ChangeTenantPlanInput,
): Promise<ActionResult<true>> {
  try {
    const admin = await verifyPlatformAdmin();
    const parsed = ChangeTenantPlanSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "Invalid input");

    const [sub, plan] = await Promise.all([
      prisma.subscription.findUnique({
        where: { businessId: parsed.data.businessId },
        select: { id: true, planId: true, currentPeriodEnd: true },
      }),
      prisma.plan.findUnique({
        where: { code: parsed.data.planCode },
        select: { id: true, billingInterval: true },
      }),
    ]);
    if (!sub) return fail("NOT_FOUND", "Subscription not found");
    if (!plan) return fail("NOT_FOUND", "Plan not found");

    const data: { planId: string; currentPeriodStart?: Date; currentPeriodEnd?: Date } = {
      planId: plan.id,
    };
    if (parsed.data.resetPeriod) {
      const now = new Date();
      const end = new Date(now);
      if (plan.billingInterval === "YEARLY") {
        end.setFullYear(end.getFullYear() + 1);
      } else {
        end.setMonth(end.getMonth() + 1);
      }
      data.currentPeriodStart = now;
      data.currentPeriodEnd = end;
    }

    await prisma.subscription.update({
      where: { businessId: parsed.data.businessId },
      data,
    });

    await prisma.activityLog.create({
      data: {
        businessId: parsed.data.businessId,
        userId: admin.userId,
        action: "admin.subscription.change_plan",
        entityType: "subscription",
        entityId: sub.id,
        diff: {
          newPlanCode: parsed.data.planCode,
          resetPeriod: parsed.data.resetPeriod,
        },
      },
    });

    revalidateTenant(parsed.data.businessId);
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}

// RESET TRIAL — bumps trialEndsAt and currentPeriodEnd forward by N days
// (default 14), sets status back to TRIALING. Useful for re-onboarding
// or extending a sales-led trial.
export async function resetTenantTrial(
  input: ResetTenantTrialInput,
): Promise<ActionResult<true>> {
  try {
    const admin = await verifyPlatformAdmin();
    const parsed = ResetTenantTrialSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "Invalid input");

    const sub = await prisma.subscription.findUnique({
      where: { businessId: parsed.data.businessId },
      select: { id: true },
    });
    if (!sub) return fail("NOT_FOUND", "Subscription not found");

    const now = new Date();
    const trialEnd = new Date(now.getTime() + parsed.data.trialDays * DAY_MS);

    await prisma.subscription.update({
      where: { businessId: parsed.data.businessId },
      data: {
        status: "TRIALING",
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        canceledAt: null,
      },
    });

    await prisma.activityLog.create({
      data: {
        businessId: parsed.data.businessId,
        userId: admin.userId,
        action: "admin.subscription.reset_trial",
        entityType: "subscription",
        entityId: sub.id,
        diff: {
          trialDays: parsed.data.trialDays,
          newTrialEndsAt: trialEnd.toISOString(),
        },
      },
    });

    revalidateTenant(parsed.data.businessId);
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}

// DELETE TENANT — soft delete the business + cancel subscription +
// soft-delete all memberships. Preserves audit trail (no hard delete).
// Requires `confirm: true` as a deliberate footgun guard.
export async function deleteTenant(
  input: DeleteTenantInput,
): Promise<ActionResult<true>> {
  try {
    const admin = await verifyPlatformAdmin();
    const parsed = DeleteTenantSchema.safeParse(input);
    if (!parsed.success) {
      return fail("VALIDATION", "Confirmation required");
    }

    const business = await prisma.business.findUnique({
      where: { id: parsed.data.businessId },
      select: { id: true, deletedAt: true },
    });
    if (!business) return fail("NOT_FOUND", "Tenant not found");
    if (business.deletedAt) {
      return fail("CONFLICT", "Tenant is already deleted");
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: business.id },
        data: { deletedAt: now },
      });
      // Cancel subscription if one exists.
      await tx.subscription
        .updateMany({
          where: { businessId: business.id },
          data: { status: "CANCELED", canceledAt: now },
        });
      // Soft-delete all memberships so members lose access on next request.
      await tx.businessMember.updateMany({
        where: { businessId: business.id, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.activityLog.create({
        data: {
          businessId: business.id,
          userId: admin.userId,
          action: "admin.tenant.delete",
          entityType: "business",
          entityId: business.id,
          diff: { reason: "soft-deleted by admin" },
        },
      });
    });

    revalidateTenant(business.id);
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}
