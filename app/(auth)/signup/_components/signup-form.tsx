"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signup } from "@/features/auth/actions";
import { SignupSchema, type SignupInput } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const form = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      fullName: "",
      businessName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: SignupInput) => {
    startTransition(async () => {
      const result = await signup(values);
      if (!result.ok) {
        const fields = result.error.fields;
        if (fields) {
          for (const [key, messages] of Object.entries(fields)) {
            const msg = messages?.[0];
            if (msg)
              form.setError(key as keyof SignupInput, { message: msg });
          }
          return;
        }
        toast.error(result.error.message);
        return;
      }
      if ("emailConfirmationRequired" in result.data) {
        setEmailSentTo(values.email);
        return;
      }
      toast.success("Welcome to Vendora");
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  };

  if (emailSentTo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to <strong>{emailSentTo}</strong>. Click
            it to finish creating your account.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="text-sm font-medium underline">
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your business account</CardTitle>
        <CardDescription>
          Start a free trial. No card required.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
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
            label="Email"
            htmlFor="email"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            error={form.formState.errors.password?.message}
            hint="At least 8 characters, with upper, lower, and a number."
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />
          </Field>
          <Field
            label="Confirm password"
            htmlFor="confirmPassword"
            error={form.formState.errors.confirmPassword?.message}
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
            />
          </Field>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
