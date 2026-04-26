"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { executeOfflineAction } from "@/lib/offline/replay";
import {
  completeAction,
  enqueueOfflineAction,
  listQueuedActions,
  markActionFailed,
  markActionProcessing,
  peekNextQueuedAction,
  type OfflineActionPayload,
  type OfflineActionType,
} from "@/lib/offline/queue";

type SyncStatus = "offline" | "queued" | "syncing" | "synced" | "error";

type OfflineSyncContextValue = {
  status: SyncStatus;
  queuedCount: number;
  queueAction: (actionType: OfflineActionType, payload: OfflineActionPayload) => Promise<void>;
  flushNow: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

function SyncStatusPill({ status, queuedCount }: { status: SyncStatus; queuedCount: number }) {
  if (status === "synced" && queuedCount === 0) return null;

  const label =
    status === "offline"
      ? "Offline"
      : status === "queued"
        ? `Queued · ${queuedCount}`
        : status === "syncing"
          ? `Syncing · ${queuedCount}`
          : status === "error"
            ? "Sync paused"
            : "Synced";

  return (
    <div className="fixed right-4 top-4 z-[60] rounded-full border border-line-strong bg-card px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
      {label}
    </div>
  );
}

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>("synced");
  const [queuedCount, setQueuedCount] = useState(0);
  const syncingRef = useRef(false);

  const refreshQueuedCount = useCallback(async () => {
    try {
      const queued = await listQueuedActions();
      setQueuedCount(queued.length);
      return queued.length;
    } catch {
      return 0;
    }
  }, []);

  const flushNow = useCallback(async () => {
    if (syncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      return;
    }

    syncingRef.current = true;
    try {
      let next = await peekNextQueuedAction();
      if (!next) {
        setStatus("synced");
        setQueuedCount(0);
        return;
      }

      setStatus("syncing");

      while (next) {
        const processing = await markActionProcessing(next.id);
        if (!processing) {
          next = await peekNextQueuedAction();
          continue;
        }

        try {
          await executeOfflineAction(processing);
          await completeAction(processing.id);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Sync failed.";
          await markActionFailed(processing.id, message);
          setStatus("error");
          break;
        }

        next = await peekNextQueuedAction();
      }

      const remaining = await refreshQueuedCount();
      if (remaining === 0 && status !== "error") {
        setStatus("synced");
      } else if (remaining > 0 && status !== "error") {
        setStatus("queued");
      }
    } finally {
      syncingRef.current = false;
    }
  }, [refreshQueuedCount, status]);

  const queueAction = useCallback(
    async (actionType: OfflineActionType, payload: OfflineActionPayload) => {
      await enqueueOfflineAction({ actionType, payload });
      const count = await refreshQueuedCount();
      setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "queued");
      if (typeof navigator !== "undefined" && navigator.onLine && count > 0) {
        void flushNow();
      }
    },
    [flushNow, refreshQueuedCount]
  );

  useEffect(() => {
    function onOnline() {
      void refreshQueuedCount().then((count) => {
        setStatus(count > 0 ? "queued" : "synced");
        if (count > 0) {
          void flushNow();
        }
      });
    }

    function onOffline() {
      setStatus("offline");
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const initialCheck = window.setTimeout(() => {
      if (navigator.onLine) {
        onOnline();
      } else {
        onOffline();
      }
    }, 0);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearTimeout(initialCheck);
    };
  }, [flushNow, refreshQueuedCount]);

  const contextValue = useMemo(
    () => ({
      status,
      queuedCount,
      queueAction,
      flushNow,
    }),
    [flushNow, queueAction, queuedCount, status]
  );

  return (
    <OfflineSyncContext.Provider value={contextValue}>
      <SyncStatusPill status={status} queuedCount={queuedCount} />
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  }
  return context;
}

