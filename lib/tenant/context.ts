import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";
import { verifySession } from "@/lib/auth/dal";

const ACTIVE_BUSINESS_COOKIE = "active_business_id";

export const getCurrentBusinessId = cache(async (): Promise<string> => {
  await verifySession();
  const cookieStore = await cookies();
  const businessId = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value;
  if (!businessId) {
    throw new AppError("FORBIDDEN", "No active business selected");
  }
  return businessId;
});

export async function setActiveBusiness(businessId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function assertTenantOwns<T extends { businessId: string }>(
  entity: T | null,
  businessId: string,
): asserts entity is T {
  if (!entity || entity.businessId !== businessId) {
    throw new AppError(
      "TENANT_MISMATCH",
      "Resource does not belong to active business",
    );
  }
}
