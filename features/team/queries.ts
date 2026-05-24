import "server-only";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/dal";
import {
  ROLE_DESCRIPTIONS,
  type SystemRole,
} from "@/lib/auth/permissions";

export type TeamMember = {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  roleName: string;
  joinedAtIso: string;
  isOwner: boolean;
};

export type TeamRoleOption = {
  id: string;
  name: SystemRole;
  description: string;
};

export type TeamData = {
  members: TeamMember[];
  roleOptions: TeamRoleOption[];
  ownerUserId: string;
  currentUserId: string;
};

export async function getTeamData(): Promise<TeamData> {
  const member = await requirePermission("member:read");

  const [business, members, roles] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: member.businessId },
      select: { ownerUserId: true },
    }),
    prisma.businessMember.findMany({
      where: { businessId: member.businessId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        role: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({
      where: { businessId: null, isSystem: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    members: members.map<TeamMember>((m) => ({
      userId: m.user.id,
      email: m.user.email,
      fullName: m.user.fullName ?? "",
      phone: m.user.phone,
      avatarUrl: m.user.avatarUrl,
      roleName: m.role.name,
      joinedAtIso: m.createdAt.toISOString(),
      isOwner: m.user.id === business.ownerUserId,
    })),
    roleOptions: roles.map<TeamRoleOption>((r) => ({
      id: r.id,
      name: r.name as SystemRole,
      description: ROLE_DESCRIPTIONS[r.name as SystemRole] ?? "",
    })),
    ownerUserId: business.ownerUserId,
    currentUserId: member.userId,
  };
}
