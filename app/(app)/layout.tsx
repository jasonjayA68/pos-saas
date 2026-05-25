import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveMember } from "@/lib/auth/dal";
import { MemberProvider } from "@/lib/auth/member-context";
import { hasPermission } from "@/lib/auth/permissions";
import { getRequiredPermissionForPath } from "@/lib/auth/route-guard";
import { getSubscriptionGate } from "@/lib/billing/guard";
import { getCurrentPlanSummary } from "@/features/dashboard/queries";
import { AppShell } from "@/components/layout/app-shell";
import { HotkeyProvider } from "@/lib/keyboard/use-hotkey";
import { BillingStatusBanner } from "./billing/_components/billing-status-banner";

const BILLING_EXEMPT_PREFIX = "/billing";

// Two-stage guard:
//   1. Subscription gate — blocks every protected route except /billing/*
//      until the workspace has an ACTIVE or TRIALING subscription.
//   2. Permission route guard — checks the granular permission required
//      for the URL prefix (see lib/auth/route-guard.ts). On miss, bounces
//      to /dashboard rather than 403ing so the user sees their available
//      surface area instead of a dead end.
//
// MemberProvider then makes the member's permissions available to all
// client components in the tree via useMember() / useCan() / <Can />.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const member = await getActiveMember();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  // Fetch gate + plan summary in parallel so the layout doesn't pay
  // two sequential round-trips per request.
  const [gate, plan] = await Promise.all([
    getSubscriptionGate(member.businessId),
    getCurrentPlanSummary(member.businessId),
  ]);
  if (gate.blocked && !pathname.startsWith(BILLING_EXEMPT_PREFIX)) {
    redirect(`/billing/plans?reason=${gate.reason ?? "expired"}`);
  }

  const requiredPerm = getRequiredPermissionForPath(pathname);
  if (requiredPerm && !hasPermission(member.permissions, requiredPerm)) {
    redirect(`/dashboard?denied=${encodeURIComponent(requiredPerm)}`);
  }

  return (
    <MemberProvider
      value={{
        userId: member.userId,
        email: member.email,
        fullName: member.fullName,
        roleName: member.roleName,
        businessId: member.businessId,
        businessName: member.businessName,
        permissions: member.permissions,
      }}
    >
      <HotkeyProvider>
        <AppShell
          businessName={member.businessName}
          fullName={member.fullName}
          email={member.email}
          roleName={member.roleName}
          plan={plan}
        >
          <BillingStatusBanner gate={gate} />
          {children}
        </AppShell>
      </HotkeyProvider>
    </MemberProvider>
  );
}
