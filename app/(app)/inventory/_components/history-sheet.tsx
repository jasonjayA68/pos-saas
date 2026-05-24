"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, History, Sliders } from "lucide-react";
import { getProductMovements } from "@/features/inventory/actions";
import type { InventoryMovementRow } from "@/features/inventory/schemas";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHDateTime } from "@/lib/dates";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  productName?: string;
};

const TYPE_LABELS: Record<InventoryMovementRow["type"], string> = {
  STOCK_IN: "Stock in",
  STOCK_OUT: "Stock out",
  SALE: "Sale",
  RETURN: "Return",
  ADJUSTMENT: "Adjustment",
};

function deltaBadge(m: InventoryMovementRow) {
  const positive = m.delta > 0;
  if (m.type === "ADJUSTMENT") {
    return (
      <Badge variant="secondary" className="font-mono">
        <Sliders className="h-3 w-3" /> {m.delta >= 0 ? "+" : ""}
        {m.delta}
      </Badge>
    );
  }
  return (
    <Badge variant={positive ? "success" : "destructive"} className="font-mono">
      {positive ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      {Math.abs(m.delta)}
    </Badge>
  );
}

export function HistorySheet({ open, onOpenChange, productId, productName }: Props) {
  const [movements, setMovements] = useState<InventoryMovementRow[] | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !productId) {
      setMovements(null);
      return;
    }
    startTransition(async () => {
      const result = await getProductMovements(productId);
      if (result.ok) {
        setMovements(result.data);
      } else {
        setMovements([]);
      }
    });
  }, [open, productId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Movement history</SheetTitle>
          <SheetDescription>
            {productName ?? "Product"} · latest 100 movements
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {pending || movements === null ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <EmptyState
              icon={History}
              title="No movements yet"
              description="Stock changes will appear here once they happen."
            />
          ) : (
            <ul className="space-y-3">
              {movements.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {TYPE_LABELS[m.type]}
                        </span>
                        {deltaBadge(m)}
                      </div>
                      {m.reason ? (
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                          {m.reason}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                        {m.userName} · {m.branchName} ·{" "}
                        {formatPHDateTime(m.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Balance
                      </div>
                      <div className="font-mono text-sm font-medium tabular-nums">
                        {m.balance}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
