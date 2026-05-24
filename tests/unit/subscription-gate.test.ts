import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma client BEFORE importing the gate so the gate's `prisma`
// reference picks up our mock.
vi.mock("@/lib/db/client", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/client";
import {
  ensureTrialSubscription,
  getSubscriptionGate,
} from "@/lib/billing/guard";

const findUnique = vi.mocked(prisma.subscription.findUnique);
const createSub = vi.mocked(prisma.subscription.create);
const findPlan = vi.mocked(prisma.plan.findUnique);

const BUSINESS_ID = "biz-1";
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ensureTrialSubscription", () => {
  it("does nothing when a subscription already exists", async () => {
    findUnique.mockResolvedValueOnce({ id: "sub-existing" } as any);
    await ensureTrialSubscription(BUSINESS_ID);
    expect(createSub).not.toHaveBeenCalled();
  });

  it("creates a 14-day Starter trial when none exists", async () => {
    findUnique.mockResolvedValueOnce(null);
    findPlan.mockResolvedValueOnce({ id: "plan-starter" } as any);
    createSub.mockResolvedValueOnce({} as any);

    await ensureTrialSubscription(BUSINESS_ID);

    expect(createSub).toHaveBeenCalledOnce();
    const args = createSub.mock.calls[0][0];
    expect(args.data.businessId).toBe(BUSINESS_ID);
    expect(args.data.planId).toBe("plan-starter");
    expect(args.data.status).toBe("TRIALING");
    const trialMs =
      args.data.trialEndsAt!.getTime() - args.data.currentPeriodStart.getTime();
    // 14 days, ± 1 second tolerance for execution time
    expect(Math.abs(trialMs - 14 * DAY)).toBeLessThan(1000);
  });

  it("swallows race-condition create errors silently", async () => {
    findUnique.mockResolvedValueOnce(null);
    findPlan.mockResolvedValueOnce({ id: "plan-starter" } as any);
    createSub.mockRejectedValueOnce(new Error("unique constraint"));
    // Should not throw
    await expect(ensureTrialSubscription(BUSINESS_ID)).resolves.toBeUndefined();
  });

  it("noop when Starter plan is missing (un-seeded DB)", async () => {
    findUnique.mockResolvedValueOnce(null);
    findPlan.mockResolvedValueOnce(null);
    await ensureTrialSubscription(BUSINESS_ID);
    expect(createSub).not.toHaveBeenCalled();
  });
});

describe("getSubscriptionGate — status branches", () => {
  const futureDate = new Date(Date.now() + 5 * DAY);
  const pastDate = new Date(Date.now() - 1 * DAY);

  const baseSub = {
    id: "sub-1",
    businessId: BUSINESS_ID,
    planId: "plan-x",
    trialEndsAt: null as Date | null,
    canceledAt: null as Date | null,
    currentPeriodStart: new Date(),
    currentPeriodEnd: futureDate,
    paymongoSubscriptionId: null,
    paymongoCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    plan: { code: "starter", name: "Starter" },
  };

  it("TRIALING + trial not over → trialing, not blocked", async () => {
    // ensureTrialSubscription's lookup
    findUnique.mockResolvedValueOnce({ id: "sub-1" } as any);
    // gate's own lookup
    findUnique.mockResolvedValueOnce({
      ...baseSub,
      status: "TRIALING",
      trialEndsAt: futureDate,
    } as any);

    const gate = await getSubscriptionGate(BUSINESS_ID);
    expect(gate.status).toBe("trialing");
    expect(gate.blocked).toBe(false);
    expect(gate.daysRemaining).toBeGreaterThan(0);
  });

  it("TRIALING + trial expired → expired, blocked, reason=trial_expired", async () => {
    findUnique.mockResolvedValueOnce({ id: "sub-1" } as any);
    findUnique.mockResolvedValueOnce({
      ...baseSub,
      status: "TRIALING",
      trialEndsAt: pastDate,
      currentPeriodEnd: pastDate,
    } as any);

    const gate = await getSubscriptionGate(BUSINESS_ID);
    expect(gate.status).toBe("expired");
    expect(gate.blocked).toBe(true);
    expect(gate.reason).toBe("trial_expired");
  });

  it("ACTIVE + still in period → active, not blocked", async () => {
    findUnique.mockResolvedValueOnce({ id: "sub-1" } as any);
    findUnique.mockResolvedValueOnce({
      ...baseSub,
      status: "ACTIVE",
    } as any);

    const gate = await getSubscriptionGate(BUSINESS_ID);
    expect(gate.status).toBe("active");
    expect(gate.blocked).toBe(false);
  });

  it("ACTIVE + period ended → expired, blocked", async () => {
    findUnique.mockResolvedValueOnce({ id: "sub-1" } as any);
    findUnique.mockResolvedValueOnce({
      ...baseSub,
      status: "ACTIVE",
      currentPeriodEnd: pastDate,
    } as any);

    const gate = await getSubscriptionGate(BUSINESS_ID);
    expect(gate.status).toBe("expired");
    expect(gate.blocked).toBe(true);
  });

  it("PAST_DUE → not blocked (grace period)", async () => {
    findUnique.mockResolvedValueOnce({ id: "sub-1" } as any);
    findUnique.mockResolvedValueOnce({
      ...baseSub,
      status: "PAST_DUE",
    } as any);

    const gate = await getSubscriptionGate(BUSINESS_ID);
    expect(gate.status).toBe("past_due");
    expect(gate.blocked).toBe(false);
  });

  it("CANCELED → blocked, reason=canceled", async () => {
    findUnique.mockResolvedValueOnce({ id: "sub-1" } as any);
    findUnique.mockResolvedValueOnce({
      ...baseSub,
      status: "CANCELED",
    } as any);

    const gate = await getSubscriptionGate(BUSINESS_ID);
    expect(gate.status).toBe("canceled");
    expect(gate.blocked).toBe(true);
    expect(gate.reason).toBe("canceled");
  });
});
