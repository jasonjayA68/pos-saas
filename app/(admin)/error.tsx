"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, ShieldOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Admin segment error boundary. Most errors here come from
// `verifyPlatformAdmin()` throwing FORBIDDEN when a signed-in but
// non-admin user navigates to /admin. We render a friendly screen
// instead of bubbling to the global-error page (which looks broken).
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[admin-error]", error);
  }, [error]);

  const isForbidden = /platform admin/i.test(error.message);

  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-24 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
        <ShieldOff className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {isForbidden ? "Admin access required" : "Something went wrong"}
      </h1>
      <p className="mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        {isForbidden ? (
          <>
            Your account isn&apos;t flagged as a platform admin. Promote it
            with{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-900">
              npm run admin:create
            </code>{" "}
            or set{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-900">
              users.is_platform_admin = true
            </code>
            , then log out and back in.
          </>
        ) : (
          error.message ||
          "An unexpected error occurred. Try again or head back."
        )}
      </p>
      {error.digest ? (
        <code className="mt-3 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          ref: {error.digest}
        </code>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {!isForbidden ? (
          <Button onClick={reset}>Try again</Button>
        ) : null}
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
