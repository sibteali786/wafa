import webpush from "web-push";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendPush(
  sub: PushSubscriptionRow,
  payload: PushPayload
): Promise<"ok" | "expired" | "error"> {
  if (!ensureVapidConfigured()) {
    console.error("Push skipped: missing VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, or VAPID_PRIVATE_KEY");
    return "error";
  }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 86400 }
    );
    return "ok";
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return "expired";
    console.error("Push dispatch error", { endpoint: sub.endpoint, status, err });
    return "error";
  }
}
