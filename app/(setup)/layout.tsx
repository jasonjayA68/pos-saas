import type { ReactNode } from "react";
import { verifySession } from "@/lib/auth/dal";

export default async function SetupLayout({ children }: { children: ReactNode }) {
  await verifySession();
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}
