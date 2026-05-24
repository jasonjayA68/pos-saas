"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBusinessSettings } from "@/features/settings/actions";
import type { BusinessSettings } from "@/features/settings/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BusinessForm({ initial }: { initial: BusinessSettings }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const set =
    (k: keyof BusinessSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [k]: e.target.value }));

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await updateBusinessSettings({
        name: values.name,
        businessType: values.businessType ?? undefined,
        phone: values.phone ?? undefined,
        email: values.email ?? undefined,
        addressLine1: values.addressLine1 ?? undefined,
        addressLine2: values.addressLine2 ?? undefined,
        city: values.city ?? undefined,
        province: values.province ?? undefined,
        postalCode: values.postalCode ?? undefined,
        country: values.country,
        timezone: values.timezone,
        currency: values.currency,
      });
      if (!result.ok) {
        setErrors(result.error.fields ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success("Business settings saved");
    });
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" error={errors.name} required>
            <Input value={values.name} onChange={set("name")} disabled={pending} />
          </Field>
          <Field label="Business type" error={errors.businessType}>
            <Input
              value={values.businessType ?? ""}
              placeholder="Retail, F&B, salon…"
              onChange={set("businessType")}
              disabled={pending}
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <Input
              value={values.phone ?? ""}
              onChange={set("phone")}
              disabled={pending}
            />
          </Field>
          <Field label="Contact email" error={errors.email}>
            <Input
              type="email"
              value={values.email ?? ""}
              onChange={set("email")}
              disabled={pending}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Address line 1" error={errors.addressLine1}>
              <Input
                value={values.addressLine1 ?? ""}
                onChange={set("addressLine1")}
                disabled={pending}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address line 2" error={errors.addressLine2}>
              <Input
                value={values.addressLine2 ?? ""}
                onChange={set("addressLine2")}
                disabled={pending}
              />
            </Field>
          </div>
          <Field label="City" error={errors.city}>
            <Input
              value={values.city ?? ""}
              onChange={set("city")}
              disabled={pending}
            />
          </Field>
          <Field label="Province" error={errors.province}>
            <Input
              value={values.province ?? ""}
              onChange={set("province")}
              disabled={pending}
            />
          </Field>
          <Field label="Postal code" error={errors.postalCode}>
            <Input
              value={values.postalCode ?? ""}
              onChange={set("postalCode")}
              disabled={pending}
            />
          </Field>
          <Field label="Country" error={errors.country}>
            <Input
              value={values.country}
              onChange={set("country")}
              maxLength={2}
              disabled={pending}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regional</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Timezone" error={errors.timezone}>
            <Input
              value={values.timezone}
              onChange={set("timezone")}
              disabled={pending}
            />
          </Field>
          <Field label="Currency" error={errors.currency}>
            <Input
              value={values.currency}
              onChange={set("currency")}
              maxLength={3}
              disabled={pending}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string[];
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </Label>
      {children}
      {error?.length ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}
