import { z } from "zod";

export const spaceFormSchema = z.discriminatedUnion("spaceType", [
  z.object({
    spaceType: z.literal("one_to_one"),
    name: z.string().trim().max(120, "Name is too long"),
  }),
  z.object({
    spaceType: z.literal("group"),
    name: z
      .string()
      .trim()
      .min(1, "Group name is required")
      .max(120, "Name is too long"),
  }),
]);

export type SpaceFormValues = z.infer<typeof spaceFormSchema>;
