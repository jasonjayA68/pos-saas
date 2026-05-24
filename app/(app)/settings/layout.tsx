import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import {
  Building2,
  KeyRound,
  Receipt as ReceiptIcon,
  ShieldCheck,
  User as UserIcon,
  Percent,
  type LucideIcon,
} from "lucide-react";
import { getActiveMember } from "@/lib/auth/dal";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
};

const TABS: Tab[] = [
  { href: "/settings/business", label: "Business", icon: Building2, permission: "business:update" },
  { href: "/settings/receipt", label: "Receipt", icon: ReceiptIcon, permission: "business:update" },
  { href: "/settings/tax", label: "Tax", icon: Percent, permission: "business:update" },
  { href: "/settings/profile", label: "Profile", icon: UserIcon },
  { href: "/settings/password", label: "Password", icon: KeyRound },
];

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [member, headersList] = await Promise.all([
    getActiveMember(),
    headers(),
  ]);
  const pathname = headersList.get("x-pathname") ?? "";

  const visible = TABS.filter(
    (t) => !t.permission || hasPermission(member.permissions, t.permission),
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-neutral-500" />
        <PageHeader
          title="Settings"
          description="Configure your business, receipt, taxes, and personal account."
        />
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {visible.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                  : "border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
