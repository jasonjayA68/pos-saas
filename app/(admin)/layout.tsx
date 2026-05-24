import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { verifyPlatformAdmin } from "@/lib/auth/dal";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await verifyPlatformAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            POS SaaS · Super Admin
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-neutral-600 sm:inline dark:text-neutral-400">
            {admin.email}
          </span>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-6">
        <aside className="hidden w-56 shrink-0 lg:block" aria-label="Admin navigation">
          <nav className="space-y-1 text-sm">
            <AdminNavLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>
              Overview
            </AdminNavLink>
            <AdminNavLink href="/admin/tenants" icon={<Users className="h-4 w-4" />}>
              Tenants
            </AdminNavLink>
            <AdminNavLink href="/admin/subscriptions" icon={<CreditCard className="h-4 w-4" />}>
              Subscriptions
            </AdminNavLink>
            <AdminNavLink href="/admin/payments" icon={<Receipt className="h-4 w-4" />}>
              Payments
            </AdminNavLink>
            <AdminNavLink href="/admin/analytics" icon={<BarChart3 className="h-4 w-4" />}>
              Analytics
            </AdminNavLink>
            <AdminNavLink href="/admin/billing-settings" icon={<Settings className="h-4 w-4" />}>
              Billing settings
            </AdminNavLink>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 bg-neutral-50 dark:bg-neutral-900">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
    >
      {icon}
      {children}
    </Link>
  );
}
