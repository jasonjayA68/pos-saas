import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import {
  type Permission,
  type SystemRole,
  parsePermissions,
} from "@/lib/auth/permissions";

const ACTIVE_BUSINESS_COOKIE = "active_business_id";

export type Session = {
  userId: string;
  email: string;
};

export type ActiveMember = {
  userId: string;
  email: string;
  fullName: string;
  businessId: string;
  businessName: string;
  roleName: string;
  permissions: Permission[];
};

export type PlatformAdmin = {
  userId: string;
  email: string;
};

export const verifySession = cache(async (): Promise<Session> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }
  return {
    userId: data.user.id,
    email: data.user.email ?? "",
  };
});

export async function requireUser(): Promise<Session> {
  return verifySession();
}

export const getPlatformAdminStatus = cache(
  async (): Promise<boolean> => {
    const session = await verifySession();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isPlatformAdmin: true, deletedAt: true },
    });
    return Boolean(user && !user.deletedAt && user.isPlatformAdmin);
  },
);

export async function verifyPlatformAdmin(): Promise<PlatformAdmin> {
  const session = await verifySession();
  const isAdmin = await getPlatformAdminStatus();
  if (!isAdmin) {
    throw new AppError("FORBIDDEN", "Platform admin access required");
  }
  return { userId: session.userId, email: session.email };
}

export const getActiveMember = cache(async (): Promise<ActiveMember> => {
  const session = await verifySession();
  const cookieStore = await cookies();
  const cookieBusinessId = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value;

  const include = {
    role: true,
    business: { select: { name: true } },
    user: { select: { fullName: true } },
  } as const;

  let member = cookieBusinessId
    ? await prisma.businessMember.findUnique({
        where: {
          businessId_userId: {
            businessId: cookieBusinessId,
            userId: session.userId,
          },
        },
        include,
      })
    : null;
  if (member?.deletedAt) member = null;

  if (!member) {
    member = await prisma.businessMember.findFirst({
      where: { userId: session.userId, deletedAt: null },
      include,
      orderBy: { createdAt: "asc" },
    });
  }

  if (!member) {
    if (await getPlatformAdminStatus()) {
      redirect("/admin");
    }
    redirect("/onboarding");
  }

  return {
    userId: session.userId,
    email: session.email,
    fullName: member.user.fullName ?? "",
    businessId: member.businessId,
    businessName: member.business.name,
    roleName: member.role.name,
    permissions: parsePermissions(member.role.permissions),
  };
});

export async function requireRole(
  allowed: SystemRole | SystemRole[],
): Promise<ActiveMember> {
  const member = await getActiveMember();
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!list.includes(member.roleName as SystemRole)) {
    throw new AppError(
      "FORBIDDEN",
      `Requires role: ${list.join(" or ")}`,
    );
  }
  return member;
}

export async function requirePermission(
  required: Permission,
): Promise<ActiveMember> {
  const member = await getActiveMember();
  if (!member.permissions.includes(required)) {
    throw new AppError("FORBIDDEN", `Missing permission: ${required}`);
  }
  return member;
}
