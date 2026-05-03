"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useOfflineSync } from "@/components/offline/sync-status-provider";
import { DateTimePicker } from "@/components/wafa/date-time-picker";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROMISE_ASSIGNEE_UNASSIGNED,
  type PromiseCreateFormValues,
  promiseCreateFormSchema,
} from "@/lib/schemas/promise-create";
import { cn } from "@/lib/utils";

const textareaClass = cn(
  "flex min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm shadow-none transition-colors outline-none",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm",
  "dark:bg-input/30",
);

type MemberOption = {
  id: string;
  label: string;
};

type PromiseCreateFormProps = {
  spaceId: string;
  members: MemberOption[];
  mode?: "create" | "edit";
  promiseId?: string;
  initialValues?: {
    title?: string;
    description?: string | null;
    dueAt?: string | null;
    assignedTo?: string | null;
  };
  onSuccess?: () => void;
};

export function PromiseCreateForm({
  spaceId,
  members,
  mode = "create",
  promiseId,
  initialValues,
  onSuccess,
}: PromiseCreateFormProps) {
  const router = useRouter();
  const { queueAction, isOnline } = useOfflineSync();
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<PromiseCreateFormValues>({
    resolver: zodResolver(promiseCreateFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      dueAt: initialValues?.dueAt ?? null,
      assignedTo: initialValues?.assignedTo ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      dueAt: initialValues?.dueAt ?? null,
      assignedTo: initialValues?.assignedTo ?? "",
    });
  }, [
    form,
    initialValues?.title,
    initialValues?.description,
    initialValues?.dueAt,
    initialValues?.assignedTo,
  ]);

  async function onSubmit(values: PromiseCreateFormValues) {
    form.clearErrors("root");
    setSuccess(null);
    setPending(true);
    const { title, description, dueAt, assignedTo } = values;
    const assignedPayload = assignedTo || null;

    try {
      if (mode === "edit") {
        if (!promiseId) {
          form.setError("root", { message: "Missing promise id." });
          return;
        }
        if (!isOnline) {
          form.setError("root", {
            message: "You're offline. Edits can't be saved right now.",
          });
          return;
        }
        const response = await fetch(`/api/promises/${promiseId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            dueAt,
            assignedTo: assignedPayload,
          }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          form.setError("root", {
            message: payload.error ?? "Could not update promise.",
          });
          return;
        }
        onSuccess?.();
        router.refresh();
        return;
      }

      let response: Response;
      try {
        response = await fetch("/api/promises", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            spaceId,
            title,
            description,
            dueAt,
            assignedTo: assignedPayload,
          }),
        });
      } catch {
        await queueAction("create_promise", {
          spaceId,
          title,
          description,
          dueAt,
          assignedTo: assignedPayload,
        });
        setSuccess("Saved offline. It will sync when you're back online.");
        onSuccess?.();
        window.location.href = `/spaces/${spaceId}?queued=1`;
        return;
      }

      const payload = (await response.json()) as {
        id?: string;
        isSuggestion?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.id) {
        form.setError("root", {
          message: payload.error ?? "Could not create promise.",
        });
        return;
      }
      onSuccess?.();
      if (payload.isSuggestion) {
        router.push(`/spaces/${spaceId}?suggested=1`);
        router.refresh();
        return;
      }
      router.push(`/promises/${payload.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Call Areeba's parents" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <textarea
                  placeholder="Optional details"
                  className={textareaClass}
                  rows={5}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueAt"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <DateTimePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assignedTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned to</FormLabel>
              <Select
                value={field.value ? field.value : PROMISE_ASSIGNEE_UNASSIGNED}
                onValueChange={(v) =>
                  field.onChange(v === PROMISE_ASSIGNEE_UNASSIGNED ? "" : v)
                }
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned">
                      {(value: string | null) => {
                        if (
                          value == null ||
                          value === "" ||
                          value === PROMISE_ASSIGNEE_UNASSIGNED
                        ) {
                          return "Unassigned";
                        }
                        return members.find((m) => m.id === value)?.label ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={PROMISE_ASSIGNEE_UNASSIGNED}>Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-muted-foreground text-sm">
          Reminder is added after creation from the promise detail page.
        </p>

        {rootError ? <p className="text-destructive text-sm">{rootError}</p> : null}
        {success ? <p className="text-primary text-sm">{success}</p> : null}

        <Button type="submit" variant="cta" size="cta" disabled={pending} className="w-full">
          {pending
            ? mode === "edit"
              ? "Saving…"
              : "Creating…"
            : mode === "edit"
              ? "Save changes"
              : "Create promise"}
        </Button>
      </form>
    </Form>
  );
}
