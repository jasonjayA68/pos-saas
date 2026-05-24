"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ensureUserBusiness } from "@/features/onboarding/actions";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  OnboardingInputSchema,
  type OnboardingInput,
} from "@/features/onboarding/schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";

type Props = {
  defaultFullName?: string;
};

export function OnboardingForm({ defaultFullName = "" }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<OnboardingInput>({
    resolver: zodResolver(OnboardingInputSchema),
    defaultValues: {
      fullName: defaultFullName,
      businessName: "",
      businessType: "retail",
      phone: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      province: "",
      postalCode: "",
      taxId: "",
      vatRegistered: false,
      receiptHeader: "",
      receiptFooter: "",
    },
  });

  const onSubmit = (values: OnboardingInput) => {
    startTransition(async () => {
      const result = await ensureUserBusiness(values);
      if (!result.ok) {
        const fields = result.error.fields;
        if (fields) {
          for (const [key, messages] of Object.entries(fields)) {
            const msg = messages?.[0];
            if (msg) {
              form.setError(key as keyof OnboardingInput, { message: msg });
            }
          }
          return;
        }
        toast.error(result.error.message);
        return;
      }
      toast.success("Business created");
      router.replace("/dashboard");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up your business</CardTitle>
        <CardDescription>
          A few details and you&apos;ll be ready to ring up sales.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-8">
          <FormSection title="About">
            <Field
              label="Your full name"
              htmlFor="fullName"
              error={form.formState.errors.fullName?.message}
            >
              <Input
                id="fullName"
                autoComplete="name"
                {...form.register("fullName")}
              />
            </Field>
            <Field
              label="Business name"
              htmlFor="businessName"
              error={form.formState.errors.businessName?.message}
            >
              <Input
                id="businessName"
                autoComplete="organization"
                {...form.register("businessName")}
              />
            </Field>
            <Field
              label="Business type"
              htmlFor="businessType"
              error={form.formState.errors.businessType?.message}
            >
              <Select id="businessType" {...form.register("businessType")}>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {BUSINESS_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>

          <FormSection title="Contact">
            <Field
              label="Phone"
              htmlFor="phone"
              error={form.formState.errors.phone?.message}
            >
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="e.g. 09171234567"
                {...form.register("phone")}
              />
            </Field>
            <Field
              label="Email"
              htmlFor="email"
              hint="Optional. Shown on receipts."
              error={form.formState.errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...form.register("email")}
              />
            </Field>
          </FormSection>

          <FormSection title="Address">
            <Field
              label="Street address"
              htmlFor="addressLine1"
              error={form.formState.errors.addressLine1?.message}
            >
              <Input
                id="addressLine1"
                autoComplete="address-line1"
                {...form.register("addressLine1")}
              />
            </Field>
            <Field
              label="Barangay / Unit / Apt"
              htmlFor="addressLine2"
              hint="Optional"
              error={form.formState.errors.addressLine2?.message}
            >
              <Input
                id="addressLine2"
                autoComplete="address-line2"
                {...form.register("addressLine2")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="City / Municipality"
                htmlFor="city"
                error={form.formState.errors.city?.message}
              >
                <Input
                  id="city"
                  autoComplete="address-level2"
                  {...form.register("city")}
                />
              </Field>
              <Field
                label="Province"
                htmlFor="province"
                error={form.formState.errors.province?.message}
              >
                <Input
                  id="province"
                  autoComplete="address-level1"
                  {...form.register("province")}
                />
              </Field>
              <Field
                label="Postal code"
                htmlFor="postalCode"
                hint="Optional"
                error={form.formState.errors.postalCode?.message}
              >
                <Input
                  id="postalCode"
                  autoComplete="postal-code"
                  {...form.register("postalCode")}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Receipt details">
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
              Currency: <strong>PHP (₱)</strong>
              <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                Used on receipts and reports. Change later in Settings.
              </span>
            </div>
            <Field
              label="TIN (Tax Identification Number)"
              htmlFor="taxId"
              hint="Optional. Needed to issue BIR-compliant receipts."
              error={form.formState.errors.taxId?.message}
            >
              <Input id="taxId" {...form.register("taxId")} />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                id="vatRegistered"
                className="mt-0.5"
                {...form.register("vatRegistered")}
              />
              <span>
                <span className="font-medium">VAT registered</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  Check this if your business is VAT-registered with the BIR.
                </span>
              </span>
            </label>
            <Field
              label="Receipt header"
              htmlFor="receiptHeader"
              hint="Optional. Shown at the top of every receipt."
              error={form.formState.errors.receiptHeader?.message}
            >
              <Textarea
                id="receiptHeader"
                rows={2}
                placeholder="e.g. Thank you for shopping with us!"
                {...form.register("receiptHeader")}
              />
            </Field>
            <Field
              label="Receipt footer"
              htmlFor="receiptFooter"
              hint="Optional. Shown at the bottom of every receipt."
              error={form.formState.errors.receiptFooter?.message}
            >
              <Textarea
                id="receiptFooter"
                rows={2}
                placeholder="e.g. This serves as your official receipt."
                {...form.register("receiptFooter")}
              />
            </Field>
          </FormSection>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Setting up…" : "Create business"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
