"use client";

import { CheckCircle2 } from "lucide-react";
import { useOfflineSync } from "@/components/offline/sync-status-provider";

type PromiseRowActionsProps = {
  promiseId: string;
  mode: "fulfill" | "approve-reject";
};

export function PromiseRowActions({ promiseId, mode }: PromiseRowActionsProps) {
  const { queueAction } = useOfflineSync();

  async function action(name: "fulfill" | "approve" | "reject") {
    if (name === "fulfill" && typeof navigator !== "undefined" && !navigator.onLine) {
      await queueAction("fulfill_promise", { promiseId });
      window.location.reload();
      return;
    }

    await fetch(`/api/promises/${promiseId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: name }),
    });
    window.location.reload();
  }

  function stopRowNavigation(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (mode === "approve-reject") {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
          aria-label="Approve suggestion"
          onClick={(event) => {
            stopRowNavigation(event);
            action("approve");
          }}
        >
          <CheckCircle2 className="size-4" />
        </button>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md border border-line-strong bg-card text-ink-secondary"
          aria-label="Reject suggestion"
          onClick={(event) => {
            stopRowNavigation(event);
            action("reject");
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="Mark fulfilled"
      onClick={(event) => {
        stopRowNavigation(event);
        action("fulfill");
      }}
    >
      <CheckCircle2 className="size-5 text-muted-foreground" />
    </button>
  );
}

