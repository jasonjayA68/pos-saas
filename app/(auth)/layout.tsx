import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

// Auth pages (login / signup / forgot-password / reset-password) share a
// centered card layout. The logo sits above the form card so every
// screen reinforces the Vendora brand before the user signs in.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--brand-soft)] p-4 dark:bg-neutral-950">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size="lg" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Cloud POS for Philippine small businesses.
          </p>
        </div>
        {children}
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-500">
          © {new Date().getFullYear()} Vendora. All rights reserved.
        </p>
      </div>
    </div>
  );
}
