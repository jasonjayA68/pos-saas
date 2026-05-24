"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  ScanLine,
} from "lucide-react";
import { useMember } from "@/lib/auth/member-context";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

// Mobile-only bottom tab bar. Hidden on md+ where the sidebar takes over.
// Items are filtered by permission so cashiers don't see Reports etc.
// "More" trips a sheet (Sidebar/Topbar already provide one — we link to
// /settings as a sensible fallback for the 5th slot).
const TABS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
  },
  {
    href: "/pos",
    label: "POS",
    icon: ScanLine,
    permission: "sale:create" as const,
  },
  {
    href: "/products",
    label: "Products",
    icon: Package,
    permission: "product:read" as const,
  },
  {
    href: "/sales",
    label: "Sales",
    icon: Receipt,
    permission: "sale:read" as const,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    permission: "report:read" as const,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const member = useMember();

  const visible = TABS.filter((t) => {
    if (!("permission" in t) || !t.permission) return true;
    return hasPermission(member.permissions, t.permission);
  }).slice(0, 4);

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white shadow-[var(--shadow-overlay)] md:hidden dark:border-neutral-800 dark:bg-neutral-950"
    >
      {visible.map((t) => {
        const active =
          pathname === t.href || pathname.startsWith(`${t.href}/`);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors",
              active
                ? "text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 transition-transform",
                active && "scale-110",
              )}
            />
            <span>{t.label}</span>
            {active ? (
              <span
                className="absolute top-0 h-0.5 w-10 rounded-full bg-neutral-900 dark:bg-neutral-100"
                aria-hidden="true"
              />
            ) : null}
          </Link>
        );
      })}
      <Link
        href="/settings"
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors",
          pathname.startsWith("/settings")
            ? "text-neutral-900 dark:text-neutral-100"
            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
        )}
      >
        <Menu className="h-5 w-5" />
        <span>More</span>
      </Link>
    </nav>
  );
}
