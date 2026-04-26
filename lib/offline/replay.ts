import type { OfflineQueueItem } from "@/lib/offline/queue";

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
    const payload = item.payload as { promiseId?: string };
    if (!payload.promiseId) {
      throw new Error("Queued fulfill action is missing promiseId.");
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
    const payload = item.payload as { promiseId?: string; body?: string };
    if (!payload.promiseId || !payload.body) {
      throw new Error("Queued note action is missing required fields.");
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

