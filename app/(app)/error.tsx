"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertOctagon, ArrowLeft, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Catches errors thrown anywhere inside the (app) segment. The app shell
// (sidebar/topbar) stays mounted because it lives in the layout *above*
// this boundary, so the user keeps their nav and can recover without a
// full reload.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-24 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
        <AlertOctagon className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        {error.message ||
          "An unexpected error occurred while loading this page. You can try again or head back."}
      </p>
      {error.digest ? (
        <code className="mt-3 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          ref: {error.digest}
        </code>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
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
