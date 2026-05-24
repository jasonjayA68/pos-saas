import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/dal", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/auth/dal")>();
  return {
    ...actual,
    requirePermission: vi.fn(),
    getActiveMember: vi.fn(),
    verifySession: vi.fn(),
    getPlatformAdminStatus: vi.fn(),
    verifyPlatformAdmin: vi.fn(),
  };
});

// We're testing the approve/reject DB transitions, not the proof-upload
// storage call. Stub it.
vi.mock("@/lib/storage/payment-proofs", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/storage/payment-proofs")>();
  return {
    ...actual,
    uploadPaymentProof: vi.fn(async () => "stub/path/to/proof.png"),
    getSignedProofUrl: vi.fn(async () => "https://stub.signed.url"),
  };
});

import { submitPayment } from "@/features/billing/actions";
import {
  approvePayment,
  rejectPayment,
} from "@/features/billing/admin-actions";
import * as dal from "@/lib/auth/dal";
import {
  createTestBusiness,
  deleteTestBusiness,
  mockMember,
  testPrisma,
  type TestBusinessFixture,
} from "../helpers/fixtures";

describe("subscription flow (integration)", () => {
  let fixture: TestBusinessFixture;

  beforeAll(async () => {
    fixture = await createTestBusiness();
    vi.mocked(dal.requirePermission).mockResolvedValue(
      mockMember(fixture, ["billing:read", "billing:update"]),
    );
    vi.mocked(dal.verifyPlatformAdmin).mockResolvedValue({
      userId: fixture.ownerUserId,
      email: fixture.ownerEmail,
    });
  });

  afterAll(async () => {
    await deleteTestBusiness(fixture.businessId);
    await testPrisma.$disconnect();
  });

  async function submitOne(planCode: string, ref = "REF-X"): Promise<string> {
    const fd = new FormData();
    fd.set("planCode", planCode);
    fd.set("method", "GCASH");
    fd.set("amountCentavos", "49900");
    fd.set("referenceNumber", `${ref}-${Math.random()}`);
    const result = await submitPayment(fd);
    if (!result.ok) throw new Error(`submitPayment failed: ${result.error.message}`);
    return result.data.paymentId;
  }

  it("submits a payment in PENDING state", async () => {
    const id = await submitOne("starter");
    const row = await testPrisma.subscriptionPayment.findUnique({
      where: { id },
    });
    expect(row!.status).toBe("PENDING");
    expect(row!.businessId).toBe(fixture.businessId);
  });

  it("approval activates the subscription with a fresh 1-month period", async () => {
    const id = await submitOne("starter", "APPROVE-1");
    const before = Date.now();
    const result = await approvePayment({ paymentId: id });
    expect(result.ok).toBe(true);

    const sub = await testPrisma.subscription.findUnique({
      where: { businessId: fixture.businessId },
    });
    expect(sub!.status).toBe("ACTIVE");

    // Period starts ~now, ends ~1 month later. Allow 1-minute tolerance.
    const startGap = Math.abs(sub!.currentPeriodStart.getTime() - before);
    expect(startGap).toBeLessThan(60_000);

    const periodMs = sub!.currentPeriodEnd.getTime() - sub!.currentPeriodStart.getTime();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    // Month length varies (28-31 days) so allow 4 days of slop.
    expect(Math.abs(periodMs - oneMonthMs)).toBeLessThan(4 * 24 * 60 * 60 * 1000);

    const updated = await testPrisma.subscriptionPayment.findUnique({
      where: { id },
    });
    expect(updated!.status).toBe("APPROVED");
    expect(updated!.reviewedAt).not.toBeNull();
  });

  it("approving while already-active EXTENDS the period (no lost time)", async () => {
    // The previous test left an ACTIVE subscription. Capture its end.
    const subBefore = await testPrisma.subscription.findUnique({
      where: { businessId: fixture.businessId },
    });
    expect(subBefore!.status).toBe("ACTIVE");
    const previousEnd = subBefore!.currentPeriodEnd.getTime();

    const id = await submitOne("starter", "EXTEND-1");
    const result = await approvePayment({ paymentId: id });
    expect(result.ok).toBe(true);

    const subAfter = await testPrisma.subscription.findUnique({
      where: { businessId: fixture.businessId },
    });
    // New end should be ~1 month past the previous end, not past now.
    expect(subAfter!.currentPeriodEnd.getTime()).toBeGreaterThan(previousEnd);
    const additionalMs =
      subAfter!.currentPeriodEnd.getTime() - previousEnd;
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(additionalMs - oneMonthMs)).toBeLessThan(
      4 * 24 * 60 * 60 * 1000,
    );
  });

  it("double-approving the same payment returns CONFLICT", async () => {
    const id = await submitOne("starter", "DOUBLE-1");
    const first = await approvePayment({ paymentId: id });
    expect(first.ok).toBe(true);
    const second = await approvePayment({ paymentId: id });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("CONFLICT");
  });

  it("rejection records reason but doesn't touch subscription", async () => {
    const subBefore = await testPrisma.subscription.findUnique({
      where: { businessId: fixture.businessId },
    });

    const id = await submitOne("starter", "REJECT-1");
    const result = await rejectPayment({
      paymentId: id,
      rejectionReason: "Reference number invalid",
    });
    expect(result.ok).toBe(true);

    const payment = await testPrisma.subscriptionPayment.findUnique({
      where: { id },
    });
    expect(payment!.status).toBe("REJECTED");
    expect(payment!.rejectionReason).toBe("Reference number invalid");

    const subAfter = await testPrisma.subscription.findUnique({
      where: { businessId: fixture.businessId },
    });
    expect(subAfter!.currentPeriodEnd.getTime()).toBe(
      subBefore!.currentPeriodEnd.getTime(),
    );
    expect(subAfter!.status).toBe(subBefore!.status);
  });

  it("blocks duplicate PENDING submissions for the same plan", async () => {
    const fd = new FormData();
    fd.set("planCode", "business");
    fd.set("method", "GCASH");
    fd.set("amountCentavos", "99900");
    fd.set("referenceNumber", "FIRST-PENDING");

    const first = await submitPayment(fd);
    expect(first.ok).toBe(true);

    const fd2 = new FormData();
    fd2.set("planCode", "business");
    fd2.set("method", "GCASH");
    fd2.set("amountCentavos", "99900");
    fd2.set("referenceNumber", "SECOND-PENDING");

    const second = await submitPayment(fd2);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("CONFLICT");
  });
});
