"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePasswordAction } from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await updatePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!result.ok) {
        setErrors(result.error.fields ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            You&apos;ll stay signed in on this device after the change.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={pending}
              aria-invalid={Boolean(errors.currentPassword)}
            />
            {errors.currentPassword ? (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.currentPassword[0]}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={pending}
              aria-invalid={Boolean(errors.newPassword)}
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              At least 8 characters.
            </p>
            {errors.newPassword ? (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.newPassword[0]}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={pending}
              aria-invalid={Boolean(errors.confirmPassword)}
            />
            {errors.confirmPassword ? (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.confirmPassword[0]}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
