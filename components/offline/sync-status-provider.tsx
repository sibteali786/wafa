"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { executeOfflineAction, OfflineConflictError } from "@/lib/offline/replay";
import {
  completeAction,
  deleteConflictDraft,
  enqueueOfflineAction,
  listConflictDrafts,
  listQueuedActions,
  markActionFailed,
  markActionProcessing,
  peekNextQueuedAction,
  purgeExpiredConflictDrafts,
  saveConflictDraft,
  type OfflineActionPayload,
  type OfflineActionType,
  type OfflineConflictDraft,
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
  if (typeof window === "undefined") return null;
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

function ConflictDraftToast({
  draft,
  onViewLatest,
  onSeeDraft,
  onDismiss,
}: {
  draft: OfflineConflictDraft;
  onViewLatest: () => void;
  onSeeDraft: () => void;
  onDismiss: () => void;
}) {
  if (typeof window === "undefined") return null;
  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[300px] rounded-xl border border-line-strong bg-card p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground">{draft.reason}</p>
      <p className="mt-1 text-xs text-muted-foreground">Her version is live.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onViewLatest}
          className="rounded-md border border-line-strong px-2 py-1 text-xs text-foreground"
        >
          View latest
        </button>
        <button
          type="button"
          onClick={onSeeDraft}
          className="rounded-md border border-line-strong px-2 py-1 text-xs text-foreground"
        >
          See my draft
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto rounded-md border border-line-strong px-2 py-1 text-xs text-muted-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function DraftViewer({
  draft,
  onClose,
}: {
  draft: OfflineConflictDraft | null;
  onClose: () => void;
}) {
  if (!draft) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl border border-line-strong bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Queued draft</p>
        <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-line-strong bg-background p-2 text-xs text-foreground whitespace-pre-wrap">
          {draft.draftText}
        </pre>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line-strong px-3 py-1 text-xs text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [mounted] = useState(() => typeof window !== "undefined");
  const [status, setStatus] = useState<SyncStatus>("synced");
  const [queuedCount, setQueuedCount] = useState(0);
  const syncingRef = useRef(false);
  const [latestConflictDraft, setLatestConflictDraft] = useState<OfflineConflictDraft | null>(null);
  const [showDraftViewer, setShowDraftViewer] = useState(false);

  const refreshQueuedCount = useCallback(async () => {
    if (!mounted) return 0;
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return 0;
    }
    try {
      const queued = await listQueuedActions();
      setQueuedCount(queued.length);
      return queued.length;
    } catch {
      return 0;
    }
  }, [mounted]);

  const flushNow = useCallback(async () => {
    if (!mounted) return;
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return;
    }
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
          if (error instanceof OfflineConflictError) {
            await completeAction(processing.id);
            const savedDraft = await saveConflictDraft({
              actionType: error.actionType,
              latestPath: error.latestPath,
              draftText: error.draftText,
              reason: error.message,
              keepDays: 7,
            });
            setLatestConflictDraft(savedDraft);
            setStatus("error");
            next = await peekNextQueuedAction();
            continue;
          }
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
  }, [mounted, refreshQueuedCount, status]);

  const queueAction = useCallback(
    async (actionType: OfflineActionType, payload: OfflineActionPayload) => {
      if (!mounted) return;
      if (typeof window === "undefined" || typeof indexedDB === "undefined") {
        return;
      }
      await enqueueOfflineAction({ actionType, payload });
      const count = await refreshQueuedCount();
      setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "queued");
      if (typeof navigator !== "undefined" && navigator.onLine && count > 0) {
        void flushNow();
      }
    },
    [flushNow, mounted, refreshQueuedCount]
  );

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return;
    }
    void purgeExpiredConflictDrafts().catch(() => {});

    function onOnline() {
      if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
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
      if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
      void listConflictDrafts().then((drafts) => {
        if (drafts[0]) {
          setLatestConflictDraft(drafts[0]);
        }
      }).catch(() => {});
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
  }, [flushNow, mounted, refreshQueuedCount]);

  const dismissConflictDraft = useCallback(async () => {
    if (!mounted) return;
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return;
    }
    if (!latestConflictDraft) return;
    await deleteConflictDraft(latestConflictDraft.id);
    const drafts = await listConflictDrafts();
    setLatestConflictDraft(drafts[0] ?? null);
    setShowDraftViewer(false);
    if (queuedCount === 0 && navigator.onLine) {
      setStatus("synced");
    }
  }, [latestConflictDraft, mounted, queuedCount]);

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
      {mounted ? <SyncStatusPill status={status} queuedCount={queuedCount} /> : null}
      {mounted && latestConflictDraft ? (
        <ConflictDraftToast
          draft={latestConflictDraft}
          onViewLatest={() => {
            window.location.href = latestConflictDraft.latestPath;
          }}
          onSeeDraft={() => setShowDraftViewer(true)}
          onDismiss={() => {
            void dismissConflictDraft();
          }}
        />
      ) : null}
      <DraftViewer
        draft={showDraftViewer ? latestConflictDraft : null}
        onClose={() => setShowDraftViewer(false)}
      />
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

