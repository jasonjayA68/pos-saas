import { describe, expect, it } from "vitest";
import {
  ROLE_PERMISSIONS,
  canManageBilling,
  canManageEmployees,
  canManageProducts,
  canProcessSales,
  canViewReports,
  hasAllPermissions,
  hasAnyPermission,
  hasGroup,
  hasPermission,
  parsePermissions,
} from "@/lib/auth/permissions";

describe("hasPermission", () => {
  it("returns true when the permission is in the list", () => {
    expect(hasPermission(["product:read"], "product:read")).toBe(true);
  });
  it("returns false when absent", () => {
    expect(hasPermission(["product:read"], "product:create")).toBe(false);
  });
});

describe("hasAnyPermission / hasAllPermissions", () => {
  it("hasAnyPermission requires only one match", () => {
    expect(
      hasAnyPermission(["sale:create"], ["sale:void", "sale:create"]),
    ).toBe(true);
  });
  it("hasAllPermissions requires every entry", () => {
    expect(
      hasAllPermissions(["sale:create"], ["sale:void", "sale:create"]),
    ).toBe(false);
    expect(
      hasAllPermissions(
        ["sale:create", "sale:void"],
        ["sale:void", "sale:create"],
      ),
    ).toBe(true);
  });
});

describe("permission groups vs seeded roles — capability matrix", () => {
  it("owner can do everything", () => {
    const p = ROLE_PERMISSIONS.owner;
    expect(canManageProducts(p)).toBe(true);
    expect(canViewReports(p)).toBe(true);
    expect(canProcessSales(p)).toBe(true);
    expect(canManageBilling(p)).toBe(true);
    expect(canManageEmployees(p)).toBe(true);
  });

  it("manager can do everything except billing", () => {
    const p = ROLE_PERMISSIONS.manager;
    expect(canManageProducts(p)).toBe(true);
    expect(canViewReports(p)).toBe(true);
    expect(canProcessSales(p)).toBe(true);
    expect(canManageBilling(p)).toBe(false);
    expect(canManageEmployees(p)).toBe(true);
  });

  it("cashier can only process sales", () => {
    const p = ROLE_PERMISSIONS.cashier;
    expect(canManageProducts(p)).toBe(false);
    expect(canViewReports(p)).toBe(false);
    expect(canProcessSales(p)).toBe(true);
    expect(canManageBilling(p)).toBe(false);
    expect(canManageEmployees(p)).toBe(false);
  });
});

describe("hasGroup", () => {
  it("matches a defined group via its `requires` permission", () => {
    expect(hasGroup(["product:update"], "manageProducts")).toBe(true);
    expect(hasGroup(["product:read"], "manageProducts")).toBe(false);
  });
});

describe("parsePermissions", () => {
  it("returns [] for non-arrays", () => {
    expect(parsePermissions(null)).toEqual([]);
    expect(parsePermissions("not an array")).toEqual([]);
    expect(parsePermissions({ p: "x" })).toEqual([]);
  });

  it("filters out unknown codes (defends against hand-edited DB rows)", () => {
    const result = parsePermissions([
      "product:read",
      "fake:permission",
      "sale:create",
      "::malformed::",
    ]);
    expect(result).toEqual(["product:read", "sale:create"]);
  });

  it("drops non-string entries silently", () => {
    expect(parsePermissions(["sale:create", 42, null, undefined])).toEqual([
      "sale:create",
    ]);
  });
});
