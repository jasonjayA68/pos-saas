"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/dal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import {
  fail,
  fromError,
  ok,
  type ActionResult,
} from "@/lib/api/response";
import { ROLE_PERMISSIONS, type SystemRole } from "@/lib/auth/permissions";
import {
  rateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import {
  ChangeRoleSchema,
  InviteMemberSchema,
  RemoveMemberSchema,
  type ChangeRoleInput,
  type InviteMemberInput,
  type RemoveMemberInput,
} from "./schemas";

// Privilege-escalation guard: managers can grant manager/cashier only;
// only owners can grant the owner role. This is enforced regardless of
// what role.permissions claims, so a hand-edited Role row can't sneak
// a manager into being able to mint other owners.
function canGrantRole(actorRole: string, targetRole: SystemRole): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "manager") return targetRole !== "owner";
  return false;
}

async function getSystemRoleId(name: SystemRole): Promise<string> {
  const role = await prisma.role.findFirst({
    where: { businessId: null, isSystem: true, name },
    select: { id: true },
  });
  if (!role) {
    throw new AppError(
      "INTERNAL",
      `System role "${name}" missing — run \`prisma db seed\`.`,
    );
  }
  return role.id;
}

export async function inviteMember(
  input: InviteMemberInput,
): Promise<
  ActionResult<{ userId: string; invited: boolean; existingUser: boolean }>
> {
  try {
    const member = await requirePermission("member:create");
    const parsed = InviteMemberSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        "Please fix the highlighted fields.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    if (!canGrantRole(member.roleName, parsed.data.roleName)) {
      return fail(
        "FORBIDDEN",
        `${member.roleName} cannot grant the ${parsed.data.roleName} role.`,
      );
    }

    // 20 invites per inviter per hour — caps Supabase email-sending abuse.
    // Supabase has its own per-project email cap; this keeps a single
    // tenant from burning through it.
    const rl = rateLimit(
      `invite:${member.userId}`,
      20,
      60 * 60 * 1000,
    );
    if (!rl.ok) {
      return fail("RATE_LIMITED", rateLimitMessage(rl, "invites"));
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const roleId = await getSystemRoleId(parsed.data.roleName);

    // Look for an existing User row by email (we mirror Supabase auth.users).
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true },
    });

    let userId: string;
    let invited = false;
    let existed = false;

    if (existingUser) {
      // User exists in our DB — check if already a member of this business.
      const existingMembership = await prisma.businessMember.findUnique({
        where: {
          businessId_userId: {
            businessId: member.businessId,
            userId: existingUser.id,
          },
        },
      });
      if (existingMembership && !existingMembership.deletedAt) {
        return fail(
          "CONFLICT",
          "This user is already a member of your business.",
        );
      }
      userId = existingUser.id;
      existed = true;

      if (existingMembership?.deletedAt) {
        // Re-activate prior membership with new role.
        await prisma.businessMember.update({
          where: {
            businessId_userId: {
              businessId: member.businessId,
              userId,
            },
          },
          data: { deletedAt: null, roleId },
        });
      } else {
        await prisma.businessMember.create({
          data: {
            businessId: member.businessId,
            userId,
            roleId,
          },
        });
      }
    } else {
      // Send a Supabase invite email — the link returns them to the app
      // where the existing /onboarding or accept-invite flow signs them in.
      const redirectTo = `${publicEnv.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`;
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        parsed.data.email,
        {
          data: parsed.data.fullName ? { fullName: parsed.data.fullName } : undefined,
          redirectTo: redirectTo || undefined,
        },
      );
      if (error || !data?.user) {
        return fail(
          "INTERNAL",
          `Invite failed: ${error?.message ?? "unknown error"}`,
        );
      }
      userId = data.user.id;
      invited = true;

      // Mirror into our local User table so subsequent joins work.
      await prisma.user.upsert({
        where: { id: userId },
        update: { email: parsed.data.email.toLowerCase() },
        create: {
          id: userId,
          email: parsed.data.email.toLowerCase(),
          fullName: parsed.data.fullName ?? null,
        },
      });

      await prisma.businessMember.create({
        data: {
          businessId: member.businessId,
          userId,
          roleId,
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        businessId: member.businessId,
        userId: member.userId,
        action: "team.invite",
        entityType: "business_member",
        entityId: userId,
        diff: {
          email: parsed.data.email,
          roleName: parsed.data.roleName,
          invited,
          existed,
        },
      },
    });

    revalidatePath("/staff");
    return ok({ userId, invited, existingUser: existed });
  } catch (err) {
    return fromError(err);
  }
}

export async function changeMemberRole(
  input: ChangeRoleInput,
): Promise<ActionResult<true>> {
  try {
    const member = await requirePermission("member:update");
    const parsed = ChangeRoleSchema.safeParse(input);
    if (!parsed.success) {
      return fail("VALIDATION", "Invalid input");
    }
    if (parsed.data.userId === member.userId) {
      return fail("FORBIDDEN", "You can't change your own role.");
    }

    const business = await prisma.business.findUniqueOrThrow({
      where: { id: member.businessId },
      select: { ownerUserId: true },
    });
    if (parsed.data.userId === business.ownerUserId) {
      return fail(
        "FORBIDDEN",
        "The business owner's role cannot be changed.",
      );
    }
    if (!canGrantRole(member.roleName, parsed.data.roleName)) {
      return fail(
        "FORBIDDEN",
        `${member.roleName} cannot grant the ${parsed.data.roleName} role.`,
      );
    }

    const roleId = await getSystemRoleId(parsed.data.roleName);
    await prisma.businessMember.update({
      where: {
        businessId_userId: {
          businessId: member.businessId,
          userId: parsed.data.userId,
        },
      },
      data: { roleId },
    });

    await prisma.activityLog.create({
      data: {
        businessId: member.businessId,
        userId: member.userId,
        action: "team.changeRole",
        entityType: "business_member",
        entityId: parsed.data.userId,
        diff: { roleName: parsed.data.roleName },
      },
    });

    revalidatePath("/staff");
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}

export async function removeMember(
  input: RemoveMemberInput,
): Promise<ActionResult<true>> {
  try {
    const member = await requirePermission("member:delete");
    const parsed = RemoveMemberSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", "Invalid input");

    if (parsed.data.userId === member.userId) {
      return fail("FORBIDDEN", "You can't remove yourself.");
    }
    const business = await prisma.business.findUniqueOrThrow({
      where: { id: member.businessId },
      select: { ownerUserId: true },
    });
    if (parsed.data.userId === business.ownerUserId) {
      return fail("FORBIDDEN", "The business owner cannot be removed.");
    }

    await prisma.businessMember.update({
      where: {
        businessId_userId: {
          businessId: member.businessId,
          userId: parsed.data.userId,
        },
      },
      data: { deletedAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        businessId: member.businessId,
        userId: member.userId,
        action: "team.remove",
        entityType: "business_member",
        entityId: parsed.data.userId,
      },
    });

    revalidatePath("/staff");
    return ok(true);
  } catch (err) {
    return fromError(err);
  }
}
