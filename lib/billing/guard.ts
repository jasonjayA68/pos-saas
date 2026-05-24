import "server-only";
import { prisma } from "@/lib/db/client";

export type SubscriptionGate = {
  status: "trialing" | "active" | "past_due" | "canceled" | "expired" | "missing";
  blocked: boolean;
  reason: "no_subscription" | "trial_expired" | "expired" | "canceled" | null;
  planCode: string | null;
  planName: string | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  daysRemaining: number | null;
};

const TRIAL_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Auto-creates a 14-day Starter trial on first access for businesses that
// don't have a subscription yet. Idempotent — safe to call from layouts.
export async function ensureTrialSubscription(
  businessId: string,
): Promise<void> {
  const existing = await prisma.subscription.findUnique({
    where: { businessId },
    select: { id: true },
  });
  if (existing) return;

  const starter = await prisma.plan.findUnique({
    where: { code: "starter" },
    select: { id: true },
  });
  if (!starter) return; // can't create trial without a seed plan

  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * MS_PER_DAY);

  await prisma.subscription
    .create({
      data: {
        businessId,
        planId: starter.id,
        status: "TRIALING",
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
      },
    })
    .catch(() => {
      // Race: another request created it. That's fine.
    });
}

export async function getSubscriptionGate(
  businessId: string,
): Promise<SubscriptionGate> {
  await ensureTrialSubscription(businessId);

  const sub = await prisma.subscription.findUnique({
    where: { businessId },
    include: { plan: { select: { code: true, name: true } } },
  });

  if (!sub) {
    return {
      status: "missing",
      blocked: true,
      reason: "no_subscription",
      planCode: null,
      planName: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      daysRemaining: null,
    };
  }

  const now = new Date();
  const periodMs = sub.currentPeriodEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(periodMs / MS_PER_DAY));

  const common = {
    planCode: sub.plan.code,
    planName: sub.plan.name,
    currentPeriodEnd: sub.currentPeriodEnd,
    trialEndsAt: sub.trialEndsAt,
    daysRemaining,
  } as const;

  switch (sub.status) {
    case "TRIALING": {
      const trialEnded =
        !sub.trialEndsAt || sub.trialEndsAt.getTime() <= now.getTime();
      return trialEnded
        ? {
            ...common,
            status: "expired",
            blocked: true,
            reason: "trial_expired",
          }
        : { ...common, status: "trialing", blocked: false, reason: null };
    }
    case "ACTIVE": {
      const ended = sub.currentPeriodEnd.getTime() <= now.getTime();
      return ended
        ? { ...common, status: "expired", blocked: true, reason: "expired" }
        : { ...common, status: "active", blocked: false, reason: null };
    }
    case "PAST_DUE":
      // Grace period: still allowed in, but we surface a banner.
      return { ...common, status: "past_due", blocked: false, reason: null };
    case "EXPIRED":
      return { ...common, status: "expired", blocked: true, reason: "expired" };
    case "CANCELED":
      return {
        ...common,
        status: "canceled",
        blocked: true,
        reason: "canceled",
      };
  }
}
