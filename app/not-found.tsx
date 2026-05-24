import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        The link might be broken, or the page may have moved. Try heading back
        to your dashboard.
      </p>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "default" }), "mt-6")}
      >
        <Home className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
