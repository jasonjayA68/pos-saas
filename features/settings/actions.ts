"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import {
  getActiveMember,
  requirePermission,
} from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import {
  fail,
  fromError,
  ok,
  type ActionResult,
} from "@/lib/api/response";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_AVATAR_BYTES,
  MAX_LOGO_BYTES,
  uploadBusinessLogo,
  uploadUserAvatar,
} from "@/lib/storage/business-assets";
import {
  rateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import {
  UpdateBusinessSchema,
  UpdatePasswordSchema,
  UpdateProfileSchema,
  UpdateReceiptSchema,
  UpdateTaxSchema,
  type UpdateBusinessInput,
  type UpdatePasswordInput,
  type UpdateProfileInput,
  type UpdateReceiptInput,
  type UpdateTaxInput,
} from "./schemas";

function validateImage(
  file: File,
  maxBytes: number,
): { ok: true } | { ok: false; message: string } {
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `File must be under ${(maxBytes / (1024 * 1024)).toFixed(0)} MB`,
    };
  }
  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
    )
  ) {
    return { ok: false, message: "Image must be PNG, JPEG, or WEBP" };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// BUSINESS PROFILE
// ─────────────────────────────────────────────────────────────────────────

export async function updateBusinessSettings(
  input: UpdateBusinessInput,
): Promise<ActionResult<{ businessId: string }>> {
  try {
    const member = await requirePermission("business:update");
    const parsed = UpdateBusinessSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Please fix the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    await prisma.business.update({
      where: { id: member.businessId },
      data: parsed.data,
    });
    await prisma.activityLog.create({
      data: {
        businessId: member.businessId,
        userId: member.userId,
        action: "business.update",
        entityType: "business",
        entityId: member.businessId,
        diff: parsed.data,
      },
    });
    revalidatePath("/settings/business");
    return ok({ businessId: member.businessId });
  } catch (err) {
    return fromError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RECEIPT — text + logo upload
// ─────────────────────────────────────────────────────────────────────────

export async function updateReceiptSettings(
  input: UpdateReceiptInput,
): Promise<ActionResult<true>> {
  try {
    const member = await requirePermission("business:update");
    const parsed = UpdateReceiptSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Please fix the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    await prisma.business.update({
      where: { id: member.businessId },
      data: parsed.data,
    });
    revalidatePath("/settings/receipt");
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}

export async function uploadBusinessLogoAction(
  formData: FormData,
): Promise<ActionResult<{ logoUrl: string }>> {
  try {
    const member = await requirePermission("business:update");
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      return fail("VALIDATION", "No file provided");
    }
    const check = validateImage(file, MAX_LOGO_BYTES);
    if (!check.ok) return fail("VALIDATION", check.message);

    const logoUrl = await uploadBusinessLogo({
      businessId: member.businessId,
      filename: file.name || "logo",
      contentType: file.type,
      body: await file.arrayBuffer(),
    });

    await prisma.business.update({
      where: { id: member.businessId },
      data: { logoUrl },
    });
    revalidatePath("/settings/receipt");
    return ok({ logoUrl });
  } catch (err) {
    return fromError(err);
  }
}

export async function removeBusinessLogoAction(): Promise<ActionResult<true>> {
  try {
    const member = await requirePermission("business:update");
    await prisma.business.update({
      where: { id: member.businessId },
      data: { logoUrl: null },
    });
    revalidatePath("/settings/receipt");
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// TAX
// ─────────────────────────────────────────────────────────────────────────

export async function updateTaxSettings(
  input: UpdateTaxInput,
): Promise<ActionResult<true>> {
  try {
    const member = await requirePermission("business:update");
    const parsed = UpdateTaxSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Please fix the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    await prisma.business.update({
      where: { id: member.businessId },
      data: parsed.data,
    });
    revalidatePath("/settings/tax");
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PROFILE — name, phone, avatar (no permission required, self-service)
// ─────────────────────────────────────────────────────────────────────────

export async function updateProfileSettings(
  input: UpdateProfileInput,
): Promise<ActionResult<true>> {
  try {
    const member = await getActiveMember();
    const parsed = UpdateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Please fix the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }
    await prisma.user.update({
      where: { id: member.userId },
      data: parsed.data,
    });
    revalidatePath("/settings/profile");
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}

export async function uploadAvatarAction(
  formData: FormData,
): Promise<ActionResult<{ avatarUrl: string }>> {
  try {
    const member = await getActiveMember();
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return fail("VALIDATION", "No file provided");
    }
    const check = validateImage(file, MAX_AVATAR_BYTES);
    if (!check.ok) return fail("VALIDATION", check.message);

    const avatarUrl = await uploadUserAvatar({
      userId: member.userId,
      filename: file.name || "avatar",
      contentType: file.type,
      body: await file.arrayBuffer(),
    });

    await prisma.user.update({
      where: { id: member.userId },
      data: { avatarUrl },
    });
    revalidatePath("/settings/profile");
    return ok({ avatarUrl });
  } catch (err) {
    return fromError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PASSWORD — verify current via signInWithPassword, then updateUser.
// Both calls go through the authenticated server client, so the session
// stays put after a successful change.
// ─────────────────────────────────────────────────────────────────────────

export async function updatePasswordAction(
  input: UpdatePasswordInput,
): Promise<ActionResult<true>> {
  try {
    const member = await getActiveMember();
    const parsed = UpdatePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Please fix the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    // 5 password-change attempts per user per 15 min. Limits brute-force
    // guessing of the *current* password via the verification call below.
    const rl = rateLimit(
      `password-update:${member.userId}`,
      5,
      15 * 60 * 1000,
    );
    if (!rl.ok) {
      return fail(
        "RATE_LIMITED",
        rateLimitMessage(rl, "password-change attempts"),
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: member.email,
      password: parsed.data.currentPassword,
    });
    if (verifyError) {
      return fail("VALIDATION", "Current password is incorrect.", {
        currentPassword: ["Current password is incorrect"],
      });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });
    if (updateError) {
      return fail(
        "INTERNAL",
        `Failed to update password: ${updateError.message}`,
      );
    }

    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}
