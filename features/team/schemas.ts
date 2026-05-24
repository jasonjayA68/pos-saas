import { z } from "zod";
import { SYSTEM_ROLES } from "@/lib/auth/permissions";

export const InviteMemberSchema = z.object({
  email: z.string().trim().email("Valid email required").max(254),
  fullName: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  roleName: z.enum(SYSTEM_ROLES),
});
export type InviteMemberInput = z.input<typeof InviteMemberSchema>;

export const ChangeRoleSchema = z.object({
  userId: z.string().uuid(),
  roleName: z.enum(SYSTEM_ROLES),
});
export type ChangeRoleInput = z.input<typeof ChangeRoleSchema>;

export const RemoveMemberSchema = z.object({
  userId: z.string().uuid(),
});
export type RemoveMemberInput = z.input<typeof RemoveMemberSchema>;
