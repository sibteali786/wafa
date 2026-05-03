import { z } from "zod";

export const avatarToneSchema = z.enum(["coral", "sand", "teal", "sky"]);

export const newOneToOneWizardSchema = z.object({
  name: z.string().max(120, "Name is too long"),
  avatarTone: avatarToneSchema,
});

export const newGroupWizardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(120, "Name is too long"),
});

export type NewOneToOneWizardValues = z.infer<typeof newOneToOneWizardSchema>;
export type NewGroupWizardValues = z.infer<typeof newGroupWizardSchema>;
