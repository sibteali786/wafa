import { z } from "zod";

/** Local profile fields; server sync comes in a later phase. */
export const meDisplayNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(120, "Display name is too long"),
});

export type MeDisplayNameValues = z.infer<typeof meDisplayNameSchema>;
