"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Trash2,
  Users,
  Package,
  Receipt,
  Activity as ActivityIcon,
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
import type { TenantDetail } from "@/features/tenants/admin-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { formatPHDateTime } from "@/lib/dates";
import { formatPHP } from "@/lib/money";

type Sheet = "extend" | "changePlan" | "resetTrial" | null;

export function TenantDetailClient({
  tenant,
  plans,
}: {
  tenant: TenantDetail;
  plans: Array<{ code: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isSuspended = tenant.subscription?.status === "CANCELED";
  const isDeleted = !!tenant.deletedAt;

  const run = (
    fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
    msg: string,
  ) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error?.message ?? "Failed");
        return;
      }
      toast.success(msg);
      router.refresh();
    });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {tenant.name}
            {isDeleted ? (
              <Badge variant="destructive" className="ml-3 align-middle">
                Deleted
              </Badge>
            ) : null}
          </h1>
          <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {tenant.slug} · created {formatPHDateTime(tenant.createdAt)}
          </div>
        </div>
        {tenant.subscription ? (
          <SubscriptionStatusBadge status={tenant.subscription.status} />
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Members" value={tenant.stats.membersCount.toString()} />
        <StatCard icon={Package} label="Products" value={tenant.stats.productsCount.toString()} />
        <StatCard
          icon={Receipt}
          label="Total sales"
          value={formatPHP(tenant.stats.salesTotalCentavos)}
          sub={`${tenant.stats.salesCount} transactions`}
        />
        <StatCard
          icon={ActivityIcon}
          label="Last active"
          value={
            tenant.stats.lastActiveAt
              ? formatPHDateTime(tenant.stats.lastActiveAt)
              : "Never"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: business + payments + activity */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Business profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Type" value={tenant.businessType ?? "—"} />
              <Field label="Owner" value={`${tenant.owner.name || "—"} (${tenant.owner.email})`} />
              <Field label="Contact email" value={tenant.email ?? "—"} />
              <Field label="Contact phone" value={tenant.phone ?? "—"} />
              <Field
                label="Location"
                value={[tenant.city, tenant.province].filter(Boolean).join(", ") || "—"}
              />
              <Field label="TIN" value={tenant.taxId ?? "—"} />
              <Field
                label="VAT-registered"
                value={tenant.vatRegistered ? "Yes" : "No"}
              />
            </CardContent>
          </Card>

          {tenant.subscription ? (
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <Field label="Plan" value={tenant.subscription.planName} />
                <Field label="Status" value={tenant.subscription.status} />
                <Field
                  label="Period start"
                  value={formatPHDateTime(tenant.subscription.currentPeriodStart)}
                />
                <Field
                  label="Period end"
                  value={formatPHDateTime(tenant.subscription.currentPeriodEnd)}
                />
                {tenant.subscription.trialEndsAt ? (
                  <Field
                    label="Trial ends"
                    value={formatPHDateTime(tenant.subscription.trialEndsAt)}
                  />
                ) : null}
                {tenant.subscription.canceledAt ? (
                  <Field
                    label="Canceled at"
                    value={formatPHDateTime(tenant.subscription.canceledAt)}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Payment history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tenant.payments.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No payments yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                      <tr>
                        <th className="px-6 py-3 font-medium">Submitted</th>
                        <th className="px-6 py-3 font-medium">Method</th>
                        <th className="px-6 py-3 font-medium">Reference</th>
                        <th className="px-6 py-3 text-right font-medium">Amount</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenant.payments.map((p) => (
                        <tr key={p.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                          <td className="px-6 py-3 text-neutral-600 dark:text-neutral-400">
                            {formatPHDateTime(p.createdAt)}
                          </td>
                          <td className="px-6 py-3">{p.method}</td>
                          <td className="px-6 py-3 font-mono text-xs">
                            {p.referenceNumber ?? "—"}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums">
                            {formatPHP(p.amountCentavos)}
                          </td>
                          <td className="px-6 py-3">
                            <PaymentStatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {tenant.recentActivity.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No activity yet.
                </div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {tenant.recentActivity.map((a) => (
                    <li
                      key={a.id}
                      className="flex justify-between gap-4 border-b border-neutral-100 pb-2 last:border-0 dark:border-neutral-800"
                    >
                      <div>
                        <div className="font-mono text-xs">{a.action}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {a.actorName ?? "system"} · {a.entityType}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                        {formatPHDateTime(a.createdAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: admin actions */}
        <Card className="lg:col-span-1 h-fit sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Admin actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ActionButton
              icon={CalendarPlus}
              onClick={() => setSheet("extend")}
              disabled={pending || isDeleted}
            >
              Extend subscription
            </ActionButton>
            <ActionButton
              icon={CalendarPlus}
              onClick={() => setSheet("changePlan")}
              disabled={pending || isDeleted}
            >
              Change plan
            </ActionButton>
            <ActionButton
              icon={RotateCcw}
              onClick={() => setSheet("resetTrial")}
              disabled={pending || isDeleted}
            >
              Reset trial
            </ActionButton>
            <hr className="my-2 border-neutral-200 dark:border-neutral-800" />
            {isSuspended ? (
              <ActionButton
                icon={Play}
                onClick={() =>
                  run(
                    () => reactivateTenant({ businessId: tenant.id }),
                    "Reactivated",
                  )
                }
                disabled={pending || isDeleted}
                variant="success"
              >
                Reactivate account
              </ActionButton>
            ) : (
              <ActionButton
                icon={Pause}
                onClick={() => setConfirmSuspend(true)}
                disabled={pending || isDeleted}
                variant="warning"
              >
                Suspend account
              </ActionButton>
            )}
            <ActionButton
              icon={Trash2}
              onClick={() => setConfirmDelete(true)}
              disabled={pending || isDeleted}
              variant="danger"
            >
              {isDeleted ? "Already deleted" : "Delete tenant"}
            </ActionButton>
          </CardContent>
        </Card>
      </div>

      {/* Action sheets + confirms */}
      <ExtendSheet
        open={sheet === "extend"}
        onClose={() => setSheet(null)}
        pending={pending}
        onSubmit={(days, reason) =>
          run(
            () => extendSubscription({ businessId: tenant.id, days, reason }),
            `Added ${days} days`,
          )
        }
      />
      <ChangePlanSheet
        open={sheet === "changePlan"}
        onClose={() => setSheet(null)}
        plans={plans}
        pending={pending}
        currentPlanCode={tenant.subscription?.planCode}
        onSubmit={(planCode, resetPeriod) =>
          run(
            () =>
              changeTenantPlan({ businessId: tenant.id, planCode, resetPeriod }),
            "Plan changed",
          )
        }
      />
      <ResetTrialSheet
        open={sheet === "resetTrial"}
        onClose={() => setSheet(null)}
        pending={pending}
        onSubmit={(days) =>
          run(
            () => resetTenantTrial({ businessId: tenant.id, trialDays: days }),
            `Trial reset to ${days} days`,
          )
        }
      />
      <ConfirmDialog
        open={confirmSuspend}
        title="Suspend tenant"
        description={`${tenant.name} will be locked out of the dashboard. Members will see the billing page only.`}
        confirmLabel="Suspend"
        variant="destructive"
        pending={pending}
        onConfirm={() => {
          setConfirmSuspend(false);
          run(() => suspendTenant({ businessId: tenant.id }), "Suspended");
        }}
        onCancel={() => setConfirmSuspend(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete tenant"
        description={`Soft-deletes ${tenant.name}, cancels the subscription, and revokes every member. Sales history and activity logs are preserved.`}
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

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
        {sub ? (
          <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {sub}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActionButton({
  icon: Icon,
  onClick,
  disabled,
  children,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const tone =
    variant === "danger"
      ? "text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
      : variant === "warning"
        ? "text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
        : variant === "success"
          ? "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tone}`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function SubscriptionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "secondary" | "success" | "destructive"; label: string }> = {
    ACTIVE: { variant: "success", label: "Active" },
    TRIALING: { variant: "secondary", label: "Trialing" },
    PAST_DUE: { variant: "secondary", label: "Past due" },
    CANCELED: { variant: "destructive", label: "Suspended" },
    EXPIRED: { variant: "destructive", label: "Expired" },
  };
  const c = map[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function PaymentStatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  if (status === "APPROVED") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Approved
      </Badge>
    );
  }
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

// ── Sheets (same shape as table-row sheets, kept local for cohesion) ──

function ExtendSheet({
  open,
  onClose,
  pending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
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
            Push the subscription end date forward.
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
            <Label htmlFor="d-days">Days to add</Label>
            <Input
              id="d-days"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number.parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label htmlFor="d-reason">Reason (optional)</Label>
            <Textarea
              id="d-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "…" : `Add ${days} days`}
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
  plans,
  pending,
  currentPlanCode,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  plans: Array<{ code: string; name: string }>;
  pending: boolean;
  currentPlanCode?: string;
  onSubmit: (planCode: string, resetPeriod: boolean) => void;
}) {
  const [planCode, setPlanCode] = useState(
    plans.find((p) => p.code !== currentPlanCode)?.code ?? plans[0]?.code ?? "",
  );
  const [resetPeriod, setResetPeriod] = useState(false);
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Change plan</SheetTitle>
          <SheetDescription>
            Move this tenant to a different plan.
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
            <Label htmlFor="d-plan">New plan</Label>
            <Select
              id="d-plan"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                  {p.code === currentPlanCode ? " (current)" : ""}
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
            <span>Reset billing period to start now.</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "…" : "Change plan"}
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
  pending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
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
            Grant this tenant a fresh trial period.
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
            <Label htmlFor="d-trial">Trial length (days)</Label>
            <Input
              id="d-trial"
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Number.parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "…" : `Reset to ${days}-day trial`}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
