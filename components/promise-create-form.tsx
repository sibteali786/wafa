"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/wafa/date-time-picker";
import { cn } from "@/lib/utils";

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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [dueAt, setDueAt] = useState<string | null>(initialValues?.dueAt ?? null);
  const [assignedTo, setAssignedTo] = useState(initialValues?.assignedTo ?? "");

  function submit() {
    setError(null);
    startTransition(async () => {
      if (mode === "edit") {
        if (!promiseId) {
          setError("Missing promise id.");
          return;
        }
        const response = await fetch(`/api/promises/${promiseId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            dueAt,
            assignedTo: assignedTo || null,
          }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(payload.error ?? "Could not update promise.");
          return;
        }
        onSuccess?.();
        router.refresh();
        return;
      }

      const response = await fetch("/api/promises", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spaceId,
          title,
          description,
          dueAt,
          assignedTo: assignedTo || null,
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        setError(payload.error ?? "Could not create promise.");
        return;
      }
      onSuccess?.();
      router.push(`/promises/${payload.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call Areeba's parents" />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details"
          className="min-h-24 w-full rounded-lg border border-line-strong bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <DateTimePicker value={dueAt} onChange={setDueAt} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Assigned to</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="h-10 w-full rounded-lg border border-line-strong bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Reminder is added after creation from the promise detail page.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending || title.trim().length === 0}
        className={cn(buttonVariants({ variant: "cta", size: "cta" }), "w-full")}
      >
        {pending ? (mode === "edit" ? "Saving…" : "Creating…") : mode === "edit" ? "Save changes" : "Create promise"}
      </button>
    </div>
  );
}

