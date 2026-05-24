"use client";

import type { ReactNode } from "react";
import { useCan } from "@/lib/auth/member-context";
import type {
  Permission,
  PermissionGroup,
  SystemRole,
} from "@/lib/auth/permissions";

// Conditional render based on the current member's role/permissions.
// Combine props with AND semantics — every supplied prop must be satisfied.
//
//   <Can permission="product:update">…</Can>
//   <Can group="manageBilling" fallback={<UpgradeBadge />}>…</Can>
//   <Can role={["owner","manager"]}>…</Can>
//   <Can anyOf={["sale:void","sale:create"]}>…</Can>
//   <Can allOf={["customer:read","customer:create"]}>…</Can>
//
// Renders `fallback` (default: null) when not allowed. Server-side code in
// Server Components should call hasPermission / hasGroup directly against
// getActiveMember() instead — see capabilities.ts.
type Props = {
  permission?: Permission;
  group?: PermissionGroup;
  anyOf?: readonly Permission[];
  allOf?: readonly Permission[];
  role?: SystemRole | SystemRole[];
  fallback?: ReactNode;
  children: ReactNode;
};

export function Can({
  permission,
  group,
  anyOf,
  allOf,
  role,
  fallback = null,
  children,
}: Props) {
  const c = useCan();

  let allowed = true;
  if (permission && !c.can(permission)) allowed = false;
  if (group && !c.hasGroup(group)) allowed = false;
  if (anyOf && !c.canAny(anyOf)) allowed = false;
  if (allOf && !c.canAll(allOf)) allowed = false;
  if (role && !c.isRole(role)) allowed = false;

  return <>{allowed ? children : fallback}</>;
}
