"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMember } from "@/lib/auth/member-context";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-items";

type SidebarNavProps = {
  onNavigate?: () => void;
};

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const member = useMember();

  // Filter items the member can't open, then drop empty groups so we
  // don't render orphan section headers.
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        !item.permission || hasPermission(member.permissions, item.permission),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-1 flex-col gap-6 px-3 py-4">
      {visibleGroups.map((group) => (
        <div key={group.label} className="space-y-1">
          <div className="px-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {group.label}
          </div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900"
                        : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
