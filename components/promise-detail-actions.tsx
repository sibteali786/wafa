"use client";

import { useState, useTransition } from "react";
import { buttonVariants } from "@/components/ui/button";
import { BottomSheet } from "@/components/wafa/bottom-sheet";
import { cn } from "@/lib/utils";
import { useOfflineSync } from "./offline/sync-status-provider";
import { WafaToast } from "./wafa/wafa-toast";

type PromiseDetailActionsProps = {
  promiseId: string;
  state: "pending" | "fulfilled" | "snoozed";
};

const snoozeOptions = [
  { id: "1h", label: "1 hour" },
  { id: "later_today", label: "Later today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "3d", label: "3 days" },
] as const;

export function PromiseDetailActions({
  promiseId,
  state,
}: PromiseDetailActionsProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { queueAction } = useOfflineSync();
  const [queued, setQueued] = useState(false);
  function runAction(action: string, extra?: Record<string, string>) {
    setError(null);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (action === "fulfill") {
        void queueAction("fulfill_promise", { promiseId, baseUpdatedAt: null });
        setQueued(true);
        return;
      }
      setError("You're offline. This action can't be performed right now.");
      return;
    }
    startTransition(async () => {
      const response = await fetch(`/api/promises/${promiseId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Action failed");
        return;
      }
      window.location.reload();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {state === "fulfilled" ? (
          <button
            type="button"
            onClick={() => runAction("reopen")}
            disabled={pending}
            className={buttonVariants({ variant: "wireGhost", size: "cta" })}
          >
            Reopen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => runAction("fulfill")}
            disabled={pending}
            className={buttonVariants({ variant: "cta", size: "cta" })}
          >
            Mark fulfilled
          </button>
        )}
        {state === "snoozed" ? (
          <button
            type="button"
            onClick={() => runAction("unsnooze")}
            disabled={pending}
            className={buttonVariants({ variant: "wireGhost", size: "cta" })}
          >
            Unsnooze
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            disabled={pending}
            className={buttonVariants({ variant: "wireGhost", size: "cta" })}
          >
            Snooze
          </button>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {queued ? (
        <WafaToast>Saved offline — will sync when you&apos;re back online</WafaToast>
      ) : null}

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Snooze promise"
      >
        <div className="space-y-2">
          {snoozeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={pending}
              onClick={() => {
                setSheetOpen(false);
                runAction("snooze", { snoozeOption: option.id });
              }}
              className={cn(
                buttonVariants({ variant: "wireGhost", size: "cta" }),
                "w-full justify-start",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
