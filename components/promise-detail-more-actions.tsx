"use client";

import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PromiseCreateForm } from "@/components/promise-create-form";
import { buttonVariants } from "@/components/ui/button";
import { BottomSheet } from "@/components/wafa/bottom-sheet";
import { WafaToast } from "@/components/wafa/wafa-toast";
import { cn } from "@/lib/utils";

type MemberOption = {
  id: string;
  label: string;
};

type PromiseDetailMoreActionsProps = {
  promiseId: string;
  spaceId: string;
  canManage: boolean;
  members: MemberOption[];
  initialValues: {
    title: string;
    description: string | null;
    dueAt: string | null;
    assignedTo: string | null;
  };
};

export function PromiseDetailMoreActions({
  promiseId,
  spaceId,
  canManage,
  members,
  initialValues,
}: PromiseDetailMoreActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  function openEdit() {
    setMenuOpen(false);
    setEditOpen(true);
  }

  function openDelete() {
    setMenuOpen(false);
    setDeleteOpen(true);
  }

  function deletePromise() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/promises/${promiseId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Could not delete promise.");
        return;
      }
      router.push(`/spaces/${spaceId}`);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="More actions"
        onClick={() => setMenuOpen(true)}
        className="inline-flex size-7 items-center justify-center rounded-md border border-line-strong bg-card text-ink-secondary"
      >
        <MoreHorizontal className="size-4 stroke-[1.8]" />
      </button>

      <BottomSheet open={menuOpen} onOpenChange={setMenuOpen} title="Promise actions">
        <div className="space-y-2">
          <button
            type="button"
            onClick={openEdit}
            className={cn(buttonVariants({ variant: "wireGhost", size: "cta" }), "w-full")}
          >
            Edit promise
          </button>
          <button
            type="button"
            onClick={openDelete}
            className={cn(buttonVariants({ variant: "wireGhost", size: "cta" }), "w-full text-coral-ink")}
          >
            Delete promise
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className={cn(buttonVariants({ variant: "wireGhost", size: "cta" }), "w-full")}
          >
            Cancel
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={editOpen} onOpenChange={setEditOpen} title="Edit promise">
        <PromiseCreateForm
          mode="edit"
          promiseId={promiseId}
          spaceId={spaceId}
          members={members}
          initialValues={initialValues}
          onSuccess={() => setEditOpen(false)}
        />
      </BottomSheet>

      <BottomSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete promise"
        footer={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={deletePromise}
              className={cn(buttonVariants({ variant: "destructive", size: "cta" }), "w-full")}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className={cn(buttonVariants({ variant: "wireGhost", size: "cta" }), "w-full")}
            >
              Cancel
            </button>
          </div>
        }
      >
        <p className="text-sm text-foreground">
          This will permanently delete the promise and any attachments. This cannot be undone.
        </p>
        {error ? <div className="mt-3"><WafaToast variant="coral">{error}</WafaToast></div> : null}
      </BottomSheet>
    </>
  );
}
