import { z } from "zod";

export const inviteRoleSchema = z.enum(["member", "admin"]);

export type InviteIntendedRole = z.infer<typeof inviteRoleSchema>;

export const inviteGenerateFormSchema = z.object({
  intendedRole: inviteRoleSchema,
});

export type InviteGenerateFormValues = z.infer<typeof inviteGenerateFormSchema>;
