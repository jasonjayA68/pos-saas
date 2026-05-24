// Single source of truth for the role/permission system.
//
// Two layers:
//   1. Granular permission codes (34 total) stored on each Role row and
//      checked at the DAL/action layer — these are what the DB actually sees.
//   2. High-level "permission groups" (5 total) that bundle related codes
//      into the verbs the product UI cares about (Manage products, View
//      reports, …). UI guards prefer groups; backend checks prefer codes.
//
// Why both: granular codes give us future flexibility (e.g. a "product
// auditor" role that can read but not write); groups give us simple
// product-language toggles that map cleanly to the five capabilities
// product/marketing think about.

export const PERMISSIONS = [
  "business:read",
  "business:update",
  "business:delete",
  "billing:read",
  "billing:update",
  "member:read",
  "member:create",
  "member:update",
  "member:delete",
  "branch:read",
  "branch:create",
  "branch:update",
  "branch:delete",
  "product:read",
  "product:create",
  "product:update",
  "product:delete",
  "category:read",
  "category:create",
  "category:update",
  "category:delete",
  "inventory:read",
  "inventory:update",
  "customer:read",
  "customer:create",
  "customer:update",
  "customer:delete",
  "sale:read",
  "sale:create",
  "sale:void",
  "expense:read",
  "expense:create",
  "expense:update",
  "expense:delete",
  "report:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const SYSTEM_ROLES = ["owner", "manager", "cashier"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

const READ_ONLY: Permission[] = PERMISSIONS.filter((p) => p.endsWith(":read"));

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  owner: [...PERMISSIONS],
  manager: PERMISSIONS.filter(
    (p) => !p.startsWith("business:") && !p.startsWith("billing:"),
  ),
  cashier: [
    ...READ_ONLY.filter(
      (p) =>
        p.startsWith("product:") ||
        p.startsWith("category:") ||
        p.startsWith("inventory:") ||
        p.startsWith("customer:") ||
        p.startsWith("sale:"),
    ),
    "customer:create",
    "sale:create",
  ],
};

export const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  owner: "Full access. Can manage billing, members, and delete the business.",
  manager: "Manages day-to-day operations. No billing or member-deletion access.",
  cashier: "Operates the POS. Can ring sales and look up products/customers.",
};

// ─────────────────────────────────────────────────────────────────────────
// PERMISSION GROUPS — high-level capabilities for UI guards.
//
// `requires` is the single permission code that "defines" the capability;
// hasGroup() checks for that code. `permissions` is the full list of codes
// the group implies (useful for docs and the role-builder UI).
// ─────────────────────────────────────────────────────────────────────────

type PermissionGroupDef = {
  label: string;
  description: string;
  permissions: readonly Permission[];
  requires: Permission;
};

export const PERMISSION_GROUPS = {
  manageProducts: {
    label: "Manage products",
    description: "Create, edit, and delete products, categories, and stock.",
    permissions: [
      "product:read",
      "product:create",
      "product:update",
      "product:delete",
      "category:read",
      "category:create",
      "category:update",
      "category:delete",
      "inventory:read",
      "inventory:update",
    ],
    requires: "product:update",
  },
  viewReports: {
    label: "View reports",
    description: "Open the reports dashboard and export sales data.",
    permissions: ["report:read"],
    requires: "report:read",
  },
  processSales: {
    label: "Process sales",
    description: "Ring sales at the POS and look up customers.",
    permissions: ["sale:read", "sale:create", "customer:read", "customer:create"],
    requires: "sale:create",
  },
  manageBilling: {
    label: "Manage billing",
    description: "Choose plans, submit payments, and view invoices.",
    permissions: ["billing:read", "billing:update"],
    requires: "billing:update",
  },
  manageEmployees: {
    label: "Manage employees",
    description: "Invite team members, assign roles, and remove access.",
    permissions: ["member:read", "member:create", "member:update", "member:delete"],
    requires: "member:update",
  },
} as const satisfies Record<string, PermissionGroupDef>;

export type PermissionGroup = keyof typeof PERMISSION_GROUPS;

// ─────────────────────────────────────────────────────────────────────────
// HELPERS — pure functions, safe in client + server contexts.
// ─────────────────────────────────────────────────────────────────────────

export function parsePermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(PERMISSIONS);
  return value.filter(
    (v): v is Permission => typeof v === "string" && allowed.has(v),
  );
}

export function hasPermission(
  permissions: Permission[],
  required: Permission,
): boolean {
  return permissions.includes(required);
}

export function hasAnyPermission(
  permissions: Permission[],
  required: readonly Permission[],
): boolean {
  return required.some((r) => permissions.includes(r));
}

export function hasAllPermissions(
  permissions: Permission[],
  required: readonly Permission[],
): boolean {
  return required.every((r) => permissions.includes(r));
}

export function hasGroup(
  permissions: Permission[],
  group: PermissionGroup,
): boolean {
  return permissions.includes(PERMISSION_GROUPS[group].requires);
}

// Convenience accessors matching the five product capabilities.
export const canManageProducts = (perms: Permission[]) =>
  hasGroup(perms, "manageProducts");
export const canViewReports = (perms: Permission[]) =>
  hasGroup(perms, "viewReports");
export const canProcessSales = (perms: Permission[]) =>
  hasGroup(perms, "processSales");
export const canManageBilling = (perms: Permission[]) =>
  hasGroup(perms, "manageBilling");
export const canManageEmployees = (perms: Permission[]) =>
  hasGroup(perms, "manageEmployees");
