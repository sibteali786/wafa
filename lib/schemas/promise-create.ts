import { z } from "zod";

export const promiseCreateFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500, "Title is too long"),
  description: z.string().max(10_000, "Description is too long"),
  dueAt: z.string().nullable(),
  assignedTo: z.string(),
});

export type PromiseCreateFormValues = z.infer<typeof promiseCreateFormSchema>;

/** Select sentinel; never a real member id. */
export const PROMISE_ASSIGNEE_UNASSIGNED = "__unassigned__" as const;
