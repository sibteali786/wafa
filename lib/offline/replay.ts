import type { OfflineQueueItem } from "@/lib/offline/queue";

export class OfflineConflictError extends Error {
  latestPath: string;
  draftText: string;
  actionType: OfflineQueueItem["actionType"];

  constructor(params: {
    message: string;
    latestPath: string;
    draftText: string;
    actionType: OfflineQueueItem["actionType"];
  }) {
    super(params.message);
    this.latestPath = params.latestPath;
    this.draftText = params.draftText;
    this.actionType = params.actionType;
  }
}

async function readJsonSafely(response: Response) {
  try {
    return (await response.json()) as { error?: string };
  } catch {
    return {};
  }
}

export async function executeOfflineAction(item: OfflineQueueItem) {
  if (item.actionType === "create_promise") {
    const response = await fetch("/api/promises", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(item.payload),
    });
    if (!response.ok) {
      const payload = await readJsonSafely(response);
      throw new Error(payload.error ?? "Could not sync queued promise.");
    }
    return;
  }

  if (item.actionType === "fulfill_promise") {
    const payload = item.payload as { promiseId?: string; baseUpdatedAt?: string };
    if (!payload.promiseId) {
      throw new Error("Queued fulfill action is missing promiseId.");
    }
    if (payload.baseUpdatedAt) {
      const versionResponse = await fetch(`/api/offline/promises/${payload.promiseId}/version`);
      if (!versionResponse.ok) {
        const versionPayload = await readJsonSafely(versionResponse);
        throw new Error(versionPayload.error ?? "Could not verify queued action version.");
      }
      const versionPayload = (await versionResponse.json()) as { updatedAt?: string };
      if (versionPayload.updatedAt && versionPayload.updatedAt > payload.baseUpdatedAt) {
        throw new OfflineConflictError({
          message: "This promise was updated by someone else first.",
          latestPath: `/promises/${payload.promiseId}`,
          draftText: "Marked as fulfilled",
          actionType: item.actionType,
        });
      }
    }

    const response = await fetch(`/api/promises/${payload.promiseId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "fulfill" }),
    });
    if (!response.ok) {
      const responsePayload = await readJsonSafely(response);
      throw new Error(responsePayload.error ?? "Could not sync fulfill action.");
    }
    return;
  }

  if (item.actionType === "add_note") {
    const payload = item.payload as { promiseId?: string; body?: string; baseUpdatedAt?: string };
    if (!payload.promiseId || !payload.body) {
      throw new Error("Queued note action is missing required fields.");
    }
    if (payload.baseUpdatedAt) {
      const versionResponse = await fetch(`/api/offline/promises/${payload.promiseId}/version`);
      if (!versionResponse.ok) {
        const versionPayload = await readJsonSafely(versionResponse);
        throw new Error(versionPayload.error ?? "Could not verify queued note version.");
      }
      const versionPayload = (await versionResponse.json()) as { updatedAt?: string };
      if (versionPayload.updatedAt && versionPayload.updatedAt > payload.baseUpdatedAt) {
        throw new OfflineConflictError({
          message: "This promise was updated by someone else first.",
          latestPath: `/promises/${payload.promiseId}`,
          draftText: payload.body,
          actionType: item.actionType,
        });
      }
    }

    const response = await fetch(`/api/promises/${payload.promiseId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: payload.body }),
    });
    if (!response.ok) {
      const responsePayload = await readJsonSafely(response);
      throw new Error(responsePayload.error ?? "Could not sync queued note.");
    }
    return;
  }

  throw new Error(`Unsupported offline action type: ${item.actionType}`);
}

