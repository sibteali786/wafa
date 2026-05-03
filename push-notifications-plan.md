# Wafa — Push Notifications Implementation Plan

## Architecture Overview

**Protocol:** W3C Web Push (RFC 8030) — works when app is closed, delivered via FCM/APNs/Mozilla push service.  
**Dispatch:** Vercel cron → Next.js API route → `web-push` npm → browser push vendor → device.  
**No SSE, no Supabase Edge Functions, no third-party push service needed.**  
**DB:** `push_subscriptions` table already exists in `0001_init.sql` — no new migration needed.

---

## Delivery Guarantees & Failure Handling

| Scenario | Behavior |
|---|---|
| Phone online at reminder time | Delivered immediately |
| Phone off, comes back within TTL | Delivered on reconnect (TTL = 24h) |
| Phone off > 24h | Silently dropped — user sees it in `/reminders/missed` in-app fallback |
| Subscription expired (410/404) | Delete subscription row from DB — no retry |
| Push vendor rate limit (429) or 5xx | Log and skip — next cron run is the natural retry |
| User denied permission | Never subscribed — `/reminders/missed` is the fallback, already built |
| iOS not installed as PWA | Push not available — in-app fallback only |

**Retry philosophy:** Cron runs every minute (or configurable interval). Any missed dispatch on one run is retried on the next because `next_run_at` is only advanced *after* successful dispatch. If dispatch fails with a transient error, `next_run_at` stays put and the next cron picks it up.

---

## Step 0 — One-time Setup (developer does this once, not in code)

Generate VAPID keys. Run this once in a terminal:

```bash
npx web-push generate-vapid-keys
```

Add to `.env.local` and Vercel environment variables:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your public key>
VAPID_PRIVATE_KEY=<your private key>
VAPID_SUBJECT=mailto:you@yourdomain.com
```

Also add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to `.env.local.example` (value left blank).

---

## Step 1 — Install Dependency

```bash
npm install web-push
npm install --save-dev @types/web-push
```

---

## Step 2 — New file: `lib/webpush.ts`

Server-only helper that wraps `web-push` dispatch.

```ts
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string; // deep link, e.g. /promises/[id]
};

/**
 * Returns true on success, false on transient error.
 * Returns 'expired' when subscription should be deleted (410/404).
 */
export async function sendPush(
  sub: PushSubscriptionRow,
  payload: PushPayload
): Promise<"ok" | "expired" | "error"> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 86400 } // 24h TTL — drop silently after that
    );
    return "ok";
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return "expired";
    console.error("Push dispatch error", { endpoint: sub.endpoint, status, err });
    return "error";
  }
}
```

---

## Step 3 — New API route: `app/api/push/subscribe/route.ts`

Saves or refreshes the browser's `PushSubscription` object for the authenticated user.

```ts
// POST /api/push/subscribe
// Body: { endpoint: string, keys: { p256dh: string, auth: string }, userAgent?: string }
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { endpoint, keys, userAgent } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const admin = createAdminClient();
  // Upsert on endpoint — same device re-subscribing just refreshes keys
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: userAgent ?? null,
    },
    { onConflict: "endpoint" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

---

## Step 4 — New API route: `app/api/push/unsubscribe/route.ts`

Deletes the subscription row when user explicitly turns off notifications or browser unsubscribes.

```ts
// POST /api/push/unsubscribe
// Body: { endpoint: string }
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
```

---

## Step 5 — Update `components/me-enable-notifications-button.tsx`

Replace the stub with the real subscription flow.

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Props = { initialEnabled: boolean };

export function EnableNotificationsButton({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notifications blocked. Please allow them in your browser settings.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
      setEnabled(true);
    } catch (err) {
      console.error("Push subscribe error", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEnabled(false);
    } catch (err) {
      console.error("Push unsubscribe error", err);
    } finally {
      setLoading(false);
    }
  }

  // Not available (iOS not installed as PWA, or old browser)
  if (typeof window !== "undefined" && !("PushManager" in window)) {
    return (
      <p className="text-sm text-muted-foreground mt-2">
        Push notifications are not available on this device. Install the app to your home screen first.
      </p>
    );
  }

  return enabled ? (
    <Button
      type="button"
      variant="wireGhost"
      size="cta"
      className="mt-2 w-full"
      disabled={loading}
      onClick={handleDisable}
    >
      {loading ? "Turning off…" : "Turn off notifications"}
    </Button>
  ) : (
    <Button
      type="button"
      variant="wireGhost"
      size="cta"
      className="mt-2 w-full"
      disabled={loading}
      onClick={handleEnable}
    >
      {loading ? "Enabling…" : "Enable notifications"}
    </Button>
  );
}
```

**Also update `app/me/page.tsx`:** Pass `initialEnabled` by checking if a `push_subscriptions` row exists for the current user. Add a server-side check before rendering the button.

---

## Step 6 — Update `app/api/cron/reminders/route.ts`

Wire actual push dispatch. This replaces the comment placeholder with real dispatch logic. The live route uses `GET(req: NextRequest)` with the Step 9 cron guard before any work.

Key changes from the skeleton:
- After scheduling algorithm runs, fetch all `push_subscriptions` rows for relevant users.
- Call `sendPush()` for each subscription.
- Delete expired subscriptions (410/404 response).
- Only advance `next_run_at` (or deactivate) after dispatch attempt — this ensures missed dispatches are retried on the next cron tick.
- Fetch promise title + space name for the notification body.

```ts
// Replace the inner loop body in app/api/cron/reminders/route.ts

// Add at top:
import { sendPush } from "@/lib/webpush";

// Inside the for loop, after determining nextRunAt, BEFORE the DB update:

// 1. Fetch promise info for notification copy
const { data: promise } = await admin
  .from("promises")
  .select("id, title, space_id, spaces(name, space_type)")
  .eq("id", reminder.promise_id)
  .single();

if (promise) {
  // 2. Fetch all space members to notify
  const { data: members } = await admin
    .from("space_members")
    .select("user_id")
    .eq("space_id", promise.space_id);

  const userIds = (members ?? []).map((m) => m.user_id);

  // 3. Fetch their push subscriptions
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const space = promise.spaces as { name: string | null; space_type: string } | null;
  const spaceLabel = space?.name ?? (space?.space_type === "one_to_one" ? "Your space" : "Group");
  const notifPayload = {
    title: `Reminder: ${promise.title}`,
    body: spaceLabel,
    url: `/promises/${promise.id}`,
  };

  // 4. Dispatch + clean up expired subs
  const expiredIds: string[] = [];
  for (const sub of subs ?? []) {
    const result = await sendPush(sub, notifPayload);
    if (result === "expired") expiredIds.push(sub.id);
  }
  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }
}

// 5. Now advance / deactivate the reminder (existing logic stays the same)
```

---

## Step 7 — Service Worker Push Event Handler

The generated `public/sw.js` from `next-pwa` does not handle push events. You need a **custom service worker** that next-pwa merges at build time.

Create `public/sw-custom.js` (next-pwa merges this via `customWorkerDir` or `additionalManifestEntries` — check next-pwa docs for your version):

Actually, the cleanest approach with next-pwa v5 is to add a custom worker file at a path configured via `next.config.ts`.

**Option A (recommended for next-pwa v5):** Create `worker/index.ts` (or `worker/push.ts`) and configure `next.config.ts` with `customWorkerDir: "worker"`. next-pwa will bundle and merge it.

**Option B (simpler):** Add push event handling directly in a `public/sw-push.js` file and register it manually after next-pwa registers its SW. Not recommended — race conditions.

**Go with Option A.** Create `worker/index.ts`:

```ts
// worker/index.ts — merged into service worker by next-pwa

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload: { title: string; body: string; url?: string };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Wafa", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/brand/wafa-icon-192.png",
      badge: "/brand/wafa-icon-monochrome.svg",
      data: { url: payload.url ?? "/" },
      // Vibrate pattern: short-long-short
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If app is already open, focus it and navigate
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(url);
            return;
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(url);
      })
  );
});
```

**Update `next.config.ts`:** add `customWorkerDir: "worker"` to the next-pwa config.

---

## Step 8 — Wire Vercel Cron

Create or update `vercel.json` at repo root:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/ping",
      "schedule": "0 0 */3 * *"
    }
  ]
}
```

`"* * * * *"` = every minute. For less aggressive firing (and lower Vercel function invocations), use `"*/5 * * * *"` (every 5 minutes) — acceptable for reminder precision.

Also add the keep-alive ping route since it's in PLAN.md but not yet created:

**New file: `app/api/cron/ping/route.ts`**
```ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  await admin.from("spaces").select("id").limit(1);
  return NextResponse.json({ ok: true });
}
```

---

## Step 9 — Cron Authentication Guard

Vercel cron jobs send a `Authorization: Bearer <CRON_SECRET>` header. Add this guard to both cron routes to prevent public invocation.

Add `CRON_SECRET` to `.env.local` and Vercel env vars (any random string).

Both handlers must import `NextRequest` / `NextResponse` and use `GET(req: NextRequest)`:

```ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of handler (createAdminClient, etc.)
}
```

Apply the same guard as the **first lines** of the body in `app/api/cron/reminders/route.ts` and `app/api/cron/ping/route.ts`.

---

## Step 10 — Update `app/me/page.tsx`

Pass subscription status to the button. The page is server-rendered so query DB server-side:

```ts
// Inside the server component, after getting the user:
const { data: subRow } = await supabase
  .from("push_subscriptions")
  .select("id")
  .eq("user_id", user.id)
  .limit(1)
  .maybeSingle();

const notificationsEnabled = !!subRow;

// Pass to client component:
<EnableNotificationsButton initialEnabled={notificationsEnabled} />
```

---

## Files to Create / Modify — Summary

| Action | File |
|---|---|
| Create | `lib/webpush.ts` |
| Create | `app/api/push/subscribe/route.ts` |
| Create | `app/api/push/unsubscribe/route.ts` |
| Create | `app/api/cron/ping/route.ts` |
| Create | `worker/index.ts` |
| Create | `vercel.json` |
| Modify | `app/api/cron/reminders/route.ts` — wire push dispatch |
| Modify | `components/me-enable-notifications-button.tsx` — real subscription flow |
| Modify | `app/me/page.tsx` — pass `initialEnabled` from DB |
| Modify | `next.config.ts` — add `customWorkerDir: "worker"` to next-pwa config |
| Env vars | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` |

---

## Environment Variables — Full List

```
# Already exists
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# New — push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=       # from: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=                  # from: same command
VAPID_SUBJECT=mailto:you@domain.com # any valid contact URI

# New — cron auth
CRON_SECRET=                        # any random string, e.g. openssl rand -hex 32
```

---

## What This Does NOT Include (intentional scope)

- **No per-device subscription management UI** — one active subscription per device is enough for v1. If user re-subscribes on same device, the upsert on `endpoint` refreshes keys.
- **No Supabase Realtime for push** — not needed. The Vercel cron is the scheduler.
- **No notification batching** — for 5–20 users with low reminder frequency, one push per reminder per user is fine.
- **No Web Push via Supabase Edge Functions** — the PLAN.md mentions this as the intended approach but the Next.js cron route is simpler, already in place, and works identically. No reason to add an Edge Function.

---

## iOS Safari Notes (tell your testers)

1. Must be installed as PWA (Safari → Share → Add to Home Screen)
2. Must be on iOS 16.4+
3. Permission prompt only appears after a user gesture (the "Enable notifications" button tap) — cannot auto-request
4. If installed as PWA and iOS 16.4+, Web Push works identically to Android
