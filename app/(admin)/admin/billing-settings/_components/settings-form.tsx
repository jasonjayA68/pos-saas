"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  updateBillingSettings,
  uploadBillingQrAction,
} from "@/features/billing/admin-actions";
import type { AdminBillingSettings } from "@/features/billing/admin-queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Field = keyof Omit<AdminBillingSettings, "updatedAtIso">;

export function BillingSettingsForm({
  initial,
}: {
  initial: AdminBillingSettings;
}) {
  const [values, setValues] = useState<AdminBillingSettings>(initial);
  const [pending, startTransition] = useTransition();
  const [uploadingKind, setUploadingKind] = useState<
    "gcash-qr" | "maya-qr" | null
  >(null);

  const set = (key: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([k]) => k !== "updatedAtIso"),
      );
      const result = await updateBillingSettings(payload);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Billing settings saved");
    });
  };

  const handleQrUpload = (kind: "gcash-qr" | "maya-qr") => async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingKind(kind);
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file);
    const result = await uploadBillingQrAction(formData);
    setUploadingKind(null);
    event.target.value = ""; // allow re-uploading the same file
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setValues((v) => ({
      ...v,
      [kind === "gcash-qr" ? "gcashQrUrl" : "mayaQrUrl"]: result.data.url,
    }));
    toast.success("QR code uploaded");
  };

  return (
    <form className="space-y-6" onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle>General instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="instructions">
            Shown above the payment options on /billing/pay
          </Label>
          <Textarea
            id="instructions"
            rows={3}
            value={values.instructions ?? ""}
            onChange={set("instructions")}
            placeholder="e.g. Send the exact amount, then upload your receipt below…"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GCash</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="gcashAccountName">Account name</Label>
            <Input
              id="gcashAccountName"
              value={values.gcashAccountName ?? ""}
              onChange={set("gcashAccountName")}
            />
          </div>
          <div>
            <Label htmlFor="gcashAccountNumber">Account number</Label>
            <Input
              id="gcashAccountNumber"
              value={values.gcashAccountNumber ?? ""}
              onChange={set("gcashAccountNumber")}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>QR code</Label>
            <div className="mt-1 flex items-center gap-4">
              {values.gcashQrUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={values.gcashQrUrl}
                  alt="GCash QR"
                  className="h-24 w-24 rounded border border-neutral-200 object-contain dark:border-neutral-800"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded border border-dashed border-neutral-300 text-xs text-neutral-400">
                  No QR
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleQrUpload("gcash-qr")}
                disabled={uploadingKind === "gcash-qr"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maya</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="mayaAccountName">Account name</Label>
            <Input
              id="mayaAccountName"
              value={values.mayaAccountName ?? ""}
              onChange={set("mayaAccountName")}
            />
          </div>
          <div>
            <Label htmlFor="mayaAccountNumber">Account number</Label>
            <Input
              id="mayaAccountNumber"
              value={values.mayaAccountNumber ?? ""}
              onChange={set("mayaAccountNumber")}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>QR code</Label>
            <div className="mt-1 flex items-center gap-4">
              {values.mayaQrUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={values.mayaQrUrl}
                  alt="Maya QR"
                  className="h-24 w-24 rounded border border-neutral-200 object-contain dark:border-neutral-800"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded border border-dashed border-neutral-300 text-xs text-neutral-400">
                  No QR
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleQrUpload("maya-qr")}
                disabled={uploadingKind === "maya-qr"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank transfer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="bankName">Bank</Label>
            <Input
              id="bankName"
              value={values.bankName ?? ""}
              onChange={set("bankName")}
            />
          </div>
          <div>
            <Label htmlFor="bankBranch">Branch</Label>
            <Input
              id="bankBranch"
              value={values.bankBranch ?? ""}
              onChange={set("bankBranch")}
            />
          </div>
          <div>
            <Label htmlFor="bankAccountName">Account name</Label>
            <Input
              id="bankAccountName"
              value={values.bankAccountName ?? ""}
              onChange={set("bankAccountName")}
            />
          </div>
          <div>
            <Label htmlFor="bankAccountNumber">Account number</Label>
            <Input
              id="bankAccountNumber"
              value={values.bankAccountNumber ?? ""}
              onChange={set("bankAccountNumber")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex items-center justify-end">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
