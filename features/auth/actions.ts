"use server";
import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/client";
import { publicEnv } from "@/lib/env";
import { getClientIp } from "@/lib/security/client-ip";
import {
  rateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import {
  buildPortalUrl,
  getPortal,
  isPortalRoutingEnabled,
} from "@/lib/portal";
import {
  ForgotPasswordSchema,
  type ForgotPasswordInput,
  LoginSchema,
  type LoginInput,
  ResetPasswordSchema,
  type ResetPasswordInput,
  SignupSchema,
  type SignupInput,
} from "@/features/auth/schemas";
import {
  fail,
  fromError,
  ok,
  type ActionResult,
} from "@/lib/api/response";

type SuccessRedirect = { redirectTo: string };
type SignupSuccess = SuccessRedirect | { emailConfirmationRequired: true };

function mapSupabaseError(message: string | undefined): string {
  if (!message) return "Authentication failed";
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email or password is incorrect";
  }
  if (lower.includes("user already registered")) {
    return "That email is already in use";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in";
  }
  if (lower.includes("email rate limit")) {
    return "Too many emails sent recently. Wait an hour, or disable email confirmation in Supabase for dev.";
  }
  if (lower.includes("over_email_send_rate_limit")) {
    return "Too many emails sent recently. Wait an hour, or disable email confirmation in Supabase for dev.";
  }
  if (lower.includes("password should be at least")) {
    return message;
  }
  return message;
}

export async function login(
  input: LoginInput,
): Promise<ActionResult<SuccessRedirect>> {
  try {
    const parsed = LoginSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors,
      );
    }

    // Throttle by IP — 10 attempts per 15 minutes per IP. Slows credential
    // stuffing without locking out legitimate users on shared networks.
    const ip = await getClientIp();
    const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.ok) {
      return fail("RATE_LIMITED", rateLimitMessage(rl, "sign-in attempts"));
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user) {
      return fail("UNAUTHENTICATED", mapSupabaseError(error?.message));
    }

    const localUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { isPlatformAdmin: true },
    });
    const isAdmin = Boolean(localUser?.isPlatformAdmin);

    // Portal enforcement: when host-based routing is on, each account is
    // locked to the correct portal at the login boundary. Cookies are
    // host-scoped so a session created on the wrong portal wouldn't even
    // transfer; we sign them back out to keep the session state honest
    // with what the error message says.
    if (isPortalRoutingEnabled()) {
      const portal = await getPortal();

      if (portal === "admin" && !isAdmin) {
        await supabase.auth.signOut();
        return fail(
          "FORBIDDEN",
          `This account isn't a platform admin. Sign in at ${publicEnv.NEXT_PUBLIC_APP_URL} instead.`,
        );
      }

      if (portal === "tenant" && isAdmin) {
        await supabase.auth.signOut();
        return fail(
          "FORBIDDEN",
          `Platform admin accounts must sign in at ${publicEnv.NEXT_PUBLIC_ADMIN_URL ?? buildPortalUrl("admin", "/login")}.`,
        );
      }

      return ok({ redirectTo: portal === "admin" ? "/admin" : "/dashboard" });
    }

    // Single-portal mode — admins and tenants share the same domain.
    return ok({ redirectTo: isAdmin ? "/admin" : "/dashboard" });
  } catch (err) {
    return fromError(err);
  }
}

export async function signup(
  input: SignupInput,
): Promise<ActionResult<SignupSuccess>> {
  try {
    const parsed = SignupSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors,
      );
    }

    // 3 signups per IP per hour — abusable for fake accounts otherwise.
    const ip = await getClientIp();
    const rl = rateLimit(`signup:${ip}`, 3, 60 * 60 * 1000);
    if (!rl.ok) {
      return fail("RATE_LIMITED", rateLimitMessage(rl, "signup attempts"));
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: {
          full_name: parsed.data.fullName,
          business_name: parsed.data.businessName,
        },
      },
    });
    if (error || !data.user) {
      return fail("VALIDATION", mapSupabaseError(error?.message));
    }

    if (!data.session) {
      return ok({ emailConfirmationRequired: true });
    }

    return ok({ redirectTo: "/onboarding" });
  } catch (err) {
    return fromError(err);
  }
}

export async function logout(): Promise<ActionResult<SuccessRedirect>> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    const cookieStore = await cookies();
    cookieStore.delete("active_business_id");
    return ok({ redirectTo: "/login" });
  } catch (err) {
    return fromError(err);
  }
}

export async function forgotPassword(
  input: ForgotPasswordInput,
): Promise<ActionResult<{ sent: true }>> {
  try {
    const parsed = ForgotPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors,
      );
    }

    // 5 reset emails per IP per hour — prevents using us to spam someone
    // else's inbox or to enumerate registered emails by timing.
    const ip = await getClientIp();
    const rl = rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return fail("RATE_LIMITED", rateLimitMessage(rl, "reset requests"));
    }

    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
    });
    return ok({ sent: true });
  } catch (err) {
    return fromError(err);
  }
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<ActionResult<SuccessRedirect>> {
  try {
    const parsed = ResetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors,
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) {
      return fail("VALIDATION", mapSupabaseError(error.message));
    }

    return ok({ redirectTo: "/login" });
  } catch (err) {
    return fromError(err);
  }
}
