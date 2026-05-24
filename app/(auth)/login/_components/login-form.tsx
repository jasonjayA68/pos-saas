"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { login } from "@/features/auth/actions";
import { LoginSchema, type LoginInput } from "@/features/auth/schemas";
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

export function LoginForm({ nextUrl }: { nextUrl?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginInput) => {
    startTransition(async () => {
      const result = await login(values);
      if (!result.ok) {
        const fields = result.error.fields;
        if (fields) {
          for (const [key, messages] of Object.entries(fields)) {
            const msg = messages?.[0];
            if (msg)
              form.setError(key as keyof LoginInput, { message: msg });
          }
          return;
        }
        toast.error(result.error.message);
        return;
      }
      router.replace(nextUrl ?? result.data.redirectTo);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Log in to your POS.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
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
          >
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
          </Field>
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs text-neutral-600 hover:underline dark:text-neutral-400"
            >
              Forgot password?
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No account yet?{" "}
            <Link href="/signup" className="font-medium underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
