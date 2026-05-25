"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw, ScanLine } from "lucide-react";

// Branded navy hero banner at the top of the tenant dashboard.
// The Refresh button uses `router.refresh()` to re-fetch every Server
// Component's data without a full page reload, so KPI tiles + activity
// feed update in place. Spins the icon while refreshing for tactile
// feedback (toast would be overkill).
type Props = {
  displayName: string;
};

export function WelcomeBanner({ displayName }: Props) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [, startTransition] = useTransition();

  const onRefresh = () => {
    setRefreshing(true);
    startTransition(() => {
      router.refresh();
      // Spin briefly so users see something happened even when the
      // re-fetch is instant.
      setTimeout(() => setRefreshing(false), 600);
    });
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-[var(--brand-primary)] text-white shadow-[var(--shadow-card)]">
      {/* Subtle decorative gradient overlay (premium SaaS feel). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/0"
      />
      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Welcome back, {displayName}!{" "}
            <span aria-hidden="true" role="img">
              👋
            </span>
          </h2>
          <p className="mt-1 text-sm text-white/80">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <Link
            href="/pos"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[var(--brand-primary)] shadow-sm transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <ScanLine className="h-4 w-4" />
            Create Sale
          </Link>
        </div>
      </div>
    </div>
  );
}
