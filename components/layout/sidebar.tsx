import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import type { CurrentPlanSummary } from "@/features/dashboard/queries";
import { cn } from "@/lib/utils";
import { CurrentPlanCard } from "./current-plan-card";
import { SidebarNav } from "./sidebar-nav";

type SidebarProps = {
  businessName: string;
  className?: string;
  "aria-label"?: string;
  plan?: CurrentPlanSummary | null;
};

export function Sidebar({
  businessName,
  className,
  "aria-label": ariaLabel,
  plan = null,
}: SidebarProps) {
  return (
    <aside
      aria-label={ariaLabel}
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950",
        className,
      )}
    >
      <div className="flex h-14 items-center border-b border-neutral-200 px-5 dark:border-neutral-800">
        <Link
          href="/dashboard"
          className="flex flex-col gap-0 leading-tight rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
          aria-label={`Vendora — ${businessName}`}
        >
          <Logo size="sm" />
          <span className="ml-8 -mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            {businessName}
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <CurrentPlanCard plan={plan} />
    </aside>
  );
}
