"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  hasGroup,
  type Permission,
  type PermissionGroup,
  type SystemRole,
} from "./permissions";

// Subset of ActiveMember (from dal.ts) safe to ship to the client. Includes
// the permission array so client guards can decide without a round trip.
export type MemberCtx = {
  userId: string;
  email: string;
  fullName: string;
  roleName: SystemRole | string;
  businessId: string;
  businessName: string;
  permissions: Permission[];
};

const MemberContext = createContext<MemberCtx | null>(null);

export function MemberProvider({
  value,
  children,
}: {
  value: MemberCtx;
  children: ReactNode;
}) {
  return (
    <MemberContext.Provider value={value}>{children}</MemberContext.Provider>
  );
}

export function useMember(): MemberCtx {
  const ctx = useContext(MemberContext);
  if (!ctx) {
    throw new Error(
      "useMember must be used inside <MemberProvider> (wired in app/(app)/layout.tsx)",
    );
  }
  return ctx;
}

// Returns a memoized bag of permission predicates. Use this in client
// components to gate buttons, menus, and conditional UI.
export function useCan() {
  const member = useMember();
  return useMemo(() => {
    const perms = member.permissions;
    return {
      role: member.roleName,
      permissions: perms,
      can: (perm: Permission) => perms.includes(perm),
      canAny: (required: readonly Permission[]) =>
        required.some((r) => perms.includes(r)),
      canAll: (required: readonly Permission[]) =>
        required.every((r) => perms.includes(r)),
      hasGroup: (group: PermissionGroup) => hasGroup(perms, group),
      isRole: (role: SystemRole | SystemRole[]) =>
        (Array.isArray(role) ? role : [role]).includes(
          member.roleName as SystemRole,
        ),
    };
  }, [member]);
}
