"use client";

import { useState } from "react";
import { History, MoreHorizontal, Plus, TrendingDown, TrendingUp, Sliders } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/page-header";
import { StockMovementSheet, type StockMode } from "./stock-movement-sheet";
import { HistorySheet } from "./history-sheet";

export type InventoryRow = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  reorder: number;
  status: "ok" | "low" | "out";
};

type Props = {
  items: InventoryRow[];
  branchId: string;
  branchName: string;
  canEdit: boolean;
};

function StatusBadge({ status }: { status: InventoryRow["status"] }) {
  if (status === "out") return <Badge variant="destructive">Out of stock</Badge>;
  if (status === "low") return <Badge variant="warning">Low stock</Badge>;
  return <Badge variant="success">In stock</Badge>;
}

export function InventoryClient({ items, branchId, branchName, canEdit }: Props) {
  const [stockSheet, setStockSheet] = useState<{
    open: boolean;
    mode: StockMode;
    productId?: string;
  }>({ open: false, mode: "in" });
  const [historySheet, setHistorySheet] = useState<{
    open: boolean;
    productId?: string;
    productName?: string;
  }>({ open: false });

  const totals = {
    total: items.length,
    low: items.filter((i) => i.status === "low").length,
    out: items.filter((i) => i.status === "out").length,
  };

  const openStock = (mode: StockMode, productId?: string) =>
    setStockSheet({ open: true, mode, productId });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Inventory"
        description={`Stock for ${branchName}`}
        actions={
          canEdit ? (
            <Button onClick={() => openStock("in")}>
              <Plus className="h-4 w-4" /> Receive stock
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tracked products</CardDescription>
            <CardTitle className="text-2xl">{totals.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low stock</CardDescription>
            <CardTitle className="text-2xl text-amber-600 dark:text-amber-400">
              {totals.low}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Out of stock</CardDescription>
            <CardTitle className="text-2xl text-red-600 dark:text-red-400">
              {totals.out}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-6 py-3 font-medium">Product</th>
              <th className="px-6 py-3 font-medium">SKU</th>
              <th className="px-6 py-3 text-right font-medium">On hand</th>
              <th className="px-6 py-3 text-right font-medium">Reorder at</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
              >
                <td className="px-6 py-3 font-medium">{item.name}</td>
                <td className="px-6 py-3 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  {item.sku}
                </td>
                <td className="px-6 py-3 text-right tabular-nums">
                  {item.quantity}{" "}
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {item.unit}
                  </span>
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                  {item.reorder}
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-6 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {canEdit ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => openStock("in", item.id)}
                          >
                            <TrendingUp className="h-4 w-4" /> Stock in
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openStock("out", item.id)}
                          >
                            <TrendingDown className="h-4 w-4" /> Stock out
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openStock("adjust", item.id)}
                          >
                            <Sliders className="h-4 w-4" /> Adjust quantity
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      ) : null}
                      <DropdownMenuItem
                        onClick={() =>
                          setHistorySheet({
                            open: true,
                            productId: item.id,
                            productName: item.name,
                          })
                        }
                      >
                        <History className="h-4 w-4" /> View history
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StockMovementSheet
        open={stockSheet.open}
        onOpenChange={(open) =>
          setStockSheet((s) => ({ ...s, open }))
        }
        mode={stockSheet.mode}
        branchId={branchId}
        products={items.map((i) => ({
          id: i.id,
          name: i.name,
          sku: i.sku,
          currentQty: i.quantity,
        }))}
        initialProductId={stockSheet.productId}
      />

      <HistorySheet
        open={historySheet.open}
        onOpenChange={(open) =>
          setHistorySheet((s) => ({ ...s, open }))
        }
        productId={historySheet.productId}
        productName={historySheet.productName}
      />
    </div>
  );
}
