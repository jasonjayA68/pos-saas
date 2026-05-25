import type { ReactNode } from "react";
import { SkipLink } from "@/components/a11y/skip-link";
import { ShortcutsDialog } from "@/components/keyboard/shortcuts-dialog";
import type { CurrentPlanSummary } from "@/features/dashboard/queries";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type AppShellProps = {
  businessName: string;
  fullName: string;
  email: string;
  roleName: string;
  children: ReactNode;
  plan?: CurrentPlanSummary | null;
};

export function AppShell({
  businessName,
  fullName,
  email,
  roleName,
  children,
  plan = null,
}: AppShellProps) {
  return (
    <div className="flex h-full flex-1">
      <SkipLink />
      <Sidebar
        businessName={businessName}
        className="hidden md:flex"
        aria-label="Primary navigation"
        plan={plan}
      />
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Topbar
          businessName={businessName}
          fullName={fullName}
          email={email}
          roleName={roleName}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-neutral-50 pb-20 outline-none md:pb-0 dark:bg-neutral-900"
        >
          {children}
        </main>
      </div>
      <BottomNav />
      <ShortcutsDialog />
    </div>
  );
}
