import type { Permission } from "./permissions";

// Maps URL prefixes to the minimum granular permission required to view
// that surface. Enforced in app/(app)/layout.tsx via getActiveMember().
// `proxy.ts` can only do the auth check (it runs on the Edge with no DB
// access); deep permission checks happen here, where Prisma is reachable.
//
// Order matters — longer/more-specific prefixes should appear first.
type RouteRule = {
  prefix: string;
  permission: Permission;
};

export const ROUTE_PERMISSIONS: ReadonlyArray<RouteRule> = [
  { prefix: "/billing", permission: "billing:read" },
  { prefix: "/pos", permission: "sale:create" },
  { prefix: "/sales", permission: "sale:read" },
  { prefix: "/reports", permission: "report:read" },
  { prefix: "/products", permission: "product:read" },
  { prefix: "/categories", permission: "category:read" },
  { prefix: "/inventory", permission: "inventory:read" },
  { prefix: "/customers", permission: "customer:read" },
  { prefix: "/expenses", permission: "expense:read" },
  { prefix: "/staff", permission: "member:read" },
  { prefix: "/team", permission: "member:read" },
  // /settings is intentionally unguarded at the layout level: profile and
  // password are accessible to everyone; /settings/business, /receipt, /tax
  // each call requirePermission("business:update") in their own page.
  { prefix: "/settings/business", permission: "business:update" },
  { prefix: "/settings/receipt", permission: "business:update" },
  { prefix: "/settings/tax", permission: "business:update" },
];

// Returns the permission required for this pathname, or null if the path
// has no requirement (e.g. /dashboard, /onboarding).
export function getRequiredPermissionForPath(
  pathname: string,
): Permission | null {
  const match = ROUTE_PERMISSIONS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  return match?.permission ?? null;
}
