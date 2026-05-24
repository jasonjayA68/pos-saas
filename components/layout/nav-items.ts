import {
  BarChart3,
  CreditCard,
  Layers,
  LayoutDashboard,
  Package,
  Receipt,
  ScanLine,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

// `permission` (when set) controls whether the link is rendered in the
// sidebar. Routes without a permission are visible to everyone (the
// route's own layout still enforces auth/subscription). Keep in sync with
// lib/auth/route-guard.ts so what users see matches what they can open.
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Sell",
    items: [
      { href: "/pos", label: "POS", icon: ScanLine, permission: "sale:create" },
      {
        href: "/products",
        label: "Products",
        icon: Package,
        permission: "product:read",
      },
      {
        href: "/inventory",
        label: "Inventory",
        icon: Layers,
        permission: "inventory:read",
      },
      {
        href: "/sales",
        label: "Sales",
        icon: Receipt,
        permission: "sale:read",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/reports",
        label: "Reports",
        icon: BarChart3,
        permission: "report:read",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/staff",
        label: "Team",
        icon: Users,
        permission: "member:read",
      },
      {
        href: "/billing",
        label: "Billing",
        icon: CreditCard,
        permission: "billing:read",
      },
      // No permission — everyone can reach /settings for Profile/Password.
      // Owner-only subpages (Business, Receipt, Tax) are gated server-side.
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
      },
    ],
  },
];

export function getNavLabelForPath(pathname: string): string | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        return item.label;
      }
    }
  }
  return null;
}
