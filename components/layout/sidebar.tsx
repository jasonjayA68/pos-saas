import Link from "next/link";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";

type SidebarProps = {
  businessName: string;
  className?: string;
  "aria-label"?: string;
};

export function Sidebar({
  businessName,
  className,
  "aria-label": ariaLabel,
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
        <Link href="/dashboard" className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            POS SaaS
          </span>
          <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {businessName}
          </span>
        </Link>
      </div>
      <SidebarNav />
    </aside>
  );
}
