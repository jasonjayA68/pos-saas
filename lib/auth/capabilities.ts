import "server-only";
import { getActiveMember } from "./dal";
import {
  canManageBilling,
  canManageEmployees,
  canManageProducts,
  canProcessSales,
  canViewReports,
  type PermissionGroup,
  hasGroup,
  type SystemRole,
} from "./permissions";

// Server-side convenience for rendering capability-aware UI in Server
// Components without manually fanning out `hasGroup(member.permissions, …)`
// calls. Cached per request via the cached getActiveMember.
export type Capabilities = Record<PermissionGroup, boolean> & {
  role: SystemRole | string;
};

export async function getMyCapabilities(): Promise<Capabilities> {
  const member = await getActiveMember();
  const perms = member.permissions;
  return {
    manageProducts: canManageProducts(perms),
    viewReports: canViewReports(perms),
    processSales: canProcessSales(perms),
    manageBilling: canManageBilling(perms),
    manageEmployees: canManageEmployees(perms),
    role: member.roleName,
  };
}

// Throws AppError("FORBIDDEN") if the member lacks the named group.
// Use in Server Actions for high-level guards. For granular checks, prefer
// requirePermission(code) from dal.ts.
export async function requireGroup(group: PermissionGroup): Promise<void> {
  const member = await getActiveMember();
  if (!hasGroup(member.permissions, group)) {
    const { AppError } = await import("@/lib/errors");
    throw new AppError(
      "FORBIDDEN",
      `Missing capability: ${group}`,
    );
  }
}
