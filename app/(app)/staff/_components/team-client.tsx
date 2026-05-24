"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Crown, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  changeMemberRole,
  inviteMember,
  removeMember,
} from "@/features/team/actions";
import type { TeamData } from "@/features/team/queries";
import { Can } from "@/components/auth/can";
import { useCan } from "@/lib/auth/member-context";
import type { SystemRole } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
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
import { formatPHDate } from "@/lib/dates";

export function TeamClient({ initial }: { initial: TeamData }) {
  const router = useRouter();
  const { role: myRole } = useCan();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  const assignableRoles = initial.roleOptions.filter((r) =>
    myRole === "owner" ? true : r.name !== "owner",
  );

  const onRoleChange = (userId: string, roleName: SystemRole) => {
    startTransition(async () => {
      const result = await changeMemberRole({ userId, roleName });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Role updated");
      router.refresh();
    });
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    const target = removeTarget;
    startTransition(async () => {
      const result = await removeMember({ userId: target.userId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${target.name} removed`);
      setRemoveTarget(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {initial.members.length}{" "}
          {initial.members.length === 1 ? "member" : "members"}
        </div>
        <Can permission="member:create">
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        </Can>
      </div>

      {initial.members.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description="Invite a manager or cashier to start collaborating."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {initial.members.map((m) => {
                    const isSelf = m.userId === initial.currentUserId;
                    const protectedRow = m.isOwner;
                    return (
                      <tr
                        key={m.userId}
                        className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              avatarUrl={m.avatarUrl}
                              fullName={m.fullName || m.email}
                            />
                            <div>
                              <div className="font-medium">
                                {m.fullName || "—"}
                                {isSelf ? (
                                  <span className="ml-2 text-xs text-neutral-500">
                                    (you)
                                  </span>
                                ) : null}
                                {m.isOwner ? (
                                  <Crown className="ml-1 inline h-3.5 w-3.5 text-amber-500" />
                                ) : null}
                              </div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                {m.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {protectedRow ? (
                            <Badge variant="default">{m.roleName}</Badge>
                          ) : (
                            <Can
                              permission="member:update"
                              fallback={
                                <Badge variant="secondary">{m.roleName}</Badge>
                              }
                            >
                              <Select
                                value={m.roleName}
                                disabled={pending || isSelf}
                                onChange={(e) =>
                                  onRoleChange(
                                    m.userId,
                                    e.target.value as SystemRole,
                                  )
                                }
                                className="max-w-[140px]"
                              >
                                {assignableRoles.map((r) => (
                                  <option key={r.id} value={r.name}>
                                    {r.name}
                                  </option>
                                ))}
                              </Select>
                            </Can>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                          {formatPHDate(new Date(m.joinedAtIso))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!protectedRow && !isSelf ? (
                            <Can permission="member:delete">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={pending}
                                onClick={() =>
                                  setRemoveTarget({
                                    userId: m.userId,
                                    name: m.fullName || m.email,
                                  })
                                }
                                aria-label={`Remove ${m.fullName || m.email}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </Button>
                            </Can>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <InviteSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roleOptions={assignableRoles}
        onSuccess={() => router.refresh()}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
        title="Remove team member"
        description={
          removeTarget
            ? `${removeTarget.name} will lose access to this business. Their past sales and audit history are preserved.`
            : ""
        }
        confirmLabel="Remove"
        variant="destructive"
        pending={pending}
      />
    </>
  );
}

function Avatar({
  avatarUrl,
  fullName,
}: {
  avatarUrl: string | null;
  fullName: string;
}) {
  if (avatarUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={avatarUrl}
        alt={fullName}
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  const init = fullName.slice(0, 1).toUpperCase();
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
      {init}
    </div>
  );
}

function InviteSheet({
  open,
  onOpenChange,
  roleOptions,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roleOptions: TeamData["roleOptions"];
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleName, setRoleName] = useState<SystemRole>(
    (roleOptions.find((r) => r.name === "cashier")?.name as SystemRole) ??
      "cashier",
  );
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const reset = () => {
    setEmail("");
    setFullName("");
    setErrors({});
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await inviteMember({ email, fullName, roleName });
      if (!result.ok) {
        setErrors(result.error.fields ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success(
        result.data.invited
          ? "Invite email sent"
          : "Member added to your business",
      );
      reset();
      onOpenChange(false);
      onSuccess();
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Invite member</SheetTitle>
          <SheetDescription>
            We&apos;ll email them a link to set up their account. If they
            already have one, they&apos;ll get instant access.
          </SheetDescription>
        </SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.email[0]}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="invite-name">Full name (optional)</Label>
            <Input
              id="invite-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <Select
              id="invite-role"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value as SystemRole)}
              disabled={pending}
            >
              {roleOptions.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {roleOptions.find((r) => r.name === roleName)?.description ?? ""}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
