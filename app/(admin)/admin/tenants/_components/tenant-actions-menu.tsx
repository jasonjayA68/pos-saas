"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CalendarPlus,
  Eye,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  changeTenantPlan,
  deleteTenant,
  extendSubscription,
  reactivateTenant,
  resetTenantTrial,
  suspendTenant,
} from "@/features/tenants/admin-actions";
import type { TenantRow } from "@/features/tenants/admin-queries";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type Action = "extend" | "changePlan" | "resetTrial" | null;

export function TenantActionsMenu({
  tenant,
  plans,
}: {
  tenant: TenantRow;
  plans: Array<{ code: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState<Action>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isSuspended = tenant.subscriptionStatus === "CANCELED";

  const run = (
    fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
    successMsg: string,
  ) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error?.message ?? "Action failed");
        return;
      }
      toast.success(successMsg);
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Tenant actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={`/admin/tenants/${tenant.id}`}>
              <Eye className="mr-2 h-4 w-4" /> View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSheetOpen("extend")}>
            <CalendarPlus className="mr-2 h-4 w-4" /> Extend subscription
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSheetOpen("changePlan")}>
            <CalendarPlus className="mr-2 h-4 w-4" /> Change plan
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSheetOpen("resetTrial")}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset trial
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isSuspended ? (
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () => reactivateTenant({ businessId: tenant.id }),
                  "Tenant reactivated",
                )
              }
            >
              <Play className="mr-2 h-4 w-4" /> Reactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => setConfirmSuspend(true)}
              className="text-amber-700 focus:text-amber-700 dark:text-amber-400 dark:focus:text-amber-400"
            >
              <Pause className="mr-2 h-4 w-4" /> Suspend
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => setConfirmDelete(true)}
            className="text-rose-700 focus:text-rose-700 dark:text-rose-400 dark:focus:text-rose-400"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete tenant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExtendSheet
        open={sheetOpen === "extend"}
        onClose={() => setSheetOpen(null)}
        tenant={tenant}
        pending={pending}
        onSubmit={(days, reason) =>
          run(
            () =>
              extendSubscription({
                businessId: tenant.id,
                days,
                reason,
              }),
            `Extended by ${days} days`,
          )
        }
      />

      <ChangePlanSheet
        open={sheetOpen === "changePlan"}
        onClose={() => setSheetOpen(null)}
        tenant={tenant}
        plans={plans}
        pending={pending}
        onSubmit={(planCode, resetPeriod) =>
          run(
            () =>
              changeTenantPlan({
                businessId: tenant.id,
                planCode,
                resetPeriod,
              }),
            "Plan changed",
          )
        }
      />

      <ResetTrialSheet
        open={sheetOpen === "resetTrial"}
        onClose={() => setSheetOpen(null)}
        tenant={tenant}
        pending={pending}
        onSubmit={(days) =>
          run(
            () =>
              resetTenantTrial({
                businessId: tenant.id,
                trialDays: days,
              }),
            `${days}-day trial reset`,
          )
        }
      />

      <ConfirmDialog
        open={confirmSuspend}
        title="Suspend tenant"
        description={`${tenant.name} will lose access to everything except /billing. They can be reactivated later without data loss.`}
        confirmLabel="Suspend"
        variant="destructive"
        pending={pending}
        onConfirm={() => {
          setConfirmSuspend(false);
          run(
            () => suspendTenant({ businessId: tenant.id }),
            "Tenant suspended",
          );
        }}
        onCancel={() => setConfirmSuspend(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete tenant"
        description={`Soft-deletes ${tenant.name} and revokes all member access. Sales and audit history are preserved for compliance. This can be reversed in the database but not from the admin UI.`}
        confirmLabel="Delete"
        variant="destructive"
        pending={pending}
        onConfirm={() => {
          setConfirmDelete(false);
          run(
            () => deleteTenant({ businessId: tenant.id, confirm: true }),
            "Tenant deleted",
          );
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function ExtendSheet({
  open,
  onClose,
  tenant,
  pending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  tenant: TenantRow;
  pending: boolean;
  onSubmit: (days: number, reason: string) => void;
}) {
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("");
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Extend subscription</SheetTitle>
          <SheetDescription>
            Push {tenant.name}&apos;s subscription end date forward.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(days, reason);
            onClose();
          }}
        >
          <div>
            <Label htmlFor="extend-days">Days to add</Label>
            <Input
              id="extend-days"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number.parseInt(e.target.value) || 0)}
              required
            />
          </div>
          <div>
            <Label htmlFor="extend-reason">Reason (optional)</Label>
            <Textarea
              id="extend-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. courtesy extension while payment is verified"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Extending…" : `Add ${days} days`}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ChangePlanSheet({
  open,
  onClose,
  tenant,
  plans,
  pending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  tenant: TenantRow;
  plans: Array<{ code: string; name: string }>;
  pending: boolean;
  onSubmit: (planCode: string, resetPeriod: boolean) => void;
}) {
  const [planCode, setPlanCode] = useState(plans[0]?.code ?? "");
  const [resetPeriod, setResetPeriod] = useState(false);
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Change plan</SheetTitle>
          <SheetDescription>
            Move {tenant.name} to a different plan.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(planCode, resetPeriod);
            onClose();
          }}
        >
          <div>
            <Label htmlFor="plan-code">New plan</Label>
            <Select
              id="plan-code"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={resetPeriod}
              onChange={(e) => setResetPeriod(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300"
            />
            <span>
              Reset billing period to start now (otherwise the existing period
              continues with the new plan).
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Changing…" : "Change plan"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ResetTrialSheet({
  open,
  onClose,
  tenant,
  pending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  tenant: TenantRow;
  pending: boolean;
  onSubmit: (days: number) => void;
}) {
  const [days, setDays] = useState(14);
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Reset trial</SheetTitle>
          <SheetDescription>
            Grant {tenant.name} a fresh trial period.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(days);
            onClose();
          }}
        >
          <div>
            <Label htmlFor="trial-days">Trial length (days)</Label>
            <Input
              id="trial-days"
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Number.parseInt(e.target.value) || 0)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Resetting…" : `Reset to ${days}-day trial`}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
