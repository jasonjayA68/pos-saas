import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { OnboardingProgress } from "@/features/dashboard/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// "Get Started" widget shown above the fold while the workspace is fresh.
// Hides itself entirely once every step is complete — no permanent
// progress bar cluttering the dashboard for established tenants.
export function GetStartedChecklist({
  progress,
}: {
  progress: OnboardingProgress;
}) {
  if (progress.allComplete) return null;

  const steps = [
    {
      label: "Add your first product",
      description: "Build your catalog so the POS has something to ring.",
      done: progress.hasProducts,
      href: "/products",
      ctaLabel: "Add a product",
    },
    {
      label: "Make your first sale",
      description: "Open the POS and ring a test transaction.",
      done: progress.hasSale,
      href: "/pos",
      ctaLabel: "Open POS",
    },
    {
      label: "Upload your logo",
      description: "Shown on every printed receipt.",
      done: progress.hasLogo,
      href: "/settings/receipt",
      ctaLabel: "Upload logo",
    },
    {
      label: "Invite a teammate",
      description: "Add a cashier or manager to your business.",
      done: progress.hasTeam,
      href: "/staff",
      ctaLabel: "Invite member",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:border-blue-900 dark:from-blue-950 dark:to-neutral-950">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Get started</CardTitle>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {completed} of {total} complete
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <div
            className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-neutral-600 dark:text-neutral-400">
            {pct}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {steps.map((s) => (
            <li
              key={s.label}
              className={cn(
                "group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors",
                s.done
                  ? "opacity-60"
                  : "hover:border-blue-200 hover:bg-white/60 dark:hover:border-blue-800 dark:hover:bg-neutral-900/60",
              )}
            >
              {s.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-neutral-400" />
              )}
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-sm font-medium",
                    s.done && "line-through",
                  )}
                >
                  {s.label}
                </div>
                <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {s.description}
                </div>
              </div>
              {!s.done ? (
                <Link
                  href={s.href}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
                >
                  {s.ctaLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
