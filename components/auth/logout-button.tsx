"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { logout } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await logout();
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  };

  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={pending}>
      <LogOut className="h-4 w-4" />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
