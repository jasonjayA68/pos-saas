"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";

type MobileNavProps = {
  businessName: string;
};

export function MobileNav({ businessName }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-neutral-200 px-5 py-4 text-left dark:border-neutral-800">
          <SheetTitle className="m-0">
            <Logo size="sm" />
          </SheetTitle>
          <SheetDescription>{businessName}</SheetDescription>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
