"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createCategory,
  deleteCategory,
} from "@/features/categories/actions";
import type { CategoryRow } from "@/features/categories/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryRow[];
};

export function CategoriesSheet({ open, onOpenChange, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  const onCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await createCategory({ name: trimmed });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Category added");
      setName("");
      router.refresh();
    });
  };

  const onDelete = (id: string, label: string) => {
    if (
      !window.confirm(
        `Delete category "${label}"? Products in this category will become uncategorized.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Category deleted");
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Categories</SheetTitle>
          <SheetDescription>
            Organize products by category for filtering and reporting.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCreate();
                }
              }}
              disabled={pending}
            />
            <Button
              onClick={onCreate}
              disabled={pending || !name.trim()}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {categories.length === 0 ? (
            <EmptyState
              icon={Tags}
              title="No categories yet"
              description="Add a category above to start organizing your catalog."
            />
          ) : (
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span className="text-sm">{c.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    onClick={() => onDelete(c.id, c.name)}
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
