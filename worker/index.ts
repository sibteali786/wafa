/** Service worker bundle (next-pwa); keep types local — project `lib` is DOM-only. */

interface ServiceWorkerSelf extends EventTarget {
  registration: {
    showNotification(
      title: string,
      options?: NotificationOptions & { vibrate?: number[]; badge?: string; data?: unknown }
    ): Promise<void>;
  };
  clients: {
    matchAll(options?: { type?: string; includeUncontrolled?: boolean }): Promise<readonly ClientLike[]>;
    openWindow(url: string | URL): Promise<unknown>;
  };
}

interface PushEventLike {
  readonly data: { json(): unknown; text(): string } | null;
  waitUntil(p: Promise<unknown>): void;
}

interface NotificationClickLike {
  readonly notification: Notification;
  waitUntil(p: Promise<unknown>): void;
}

interface ClientLike {
  readonly url?: string;
  focus(): Promise<ClientLike>;
  navigate?(url: string | URL): Promise<boolean | void>;
}

const sw = self as unknown as ServiceWorkerSelf;

type ExtendableEvent = Event & { waitUntil: (p: Promise<unknown>) => void };

sw.addEventListener("install", (event: Event) => {
  const ev = event as ExtendableEvent;
  ev.waitUntil(Promise.resolve());
  (self as unknown as { skipWaiting(): void }).skipWaiting();
});

sw.addEventListener("activate", (event: Event) => {
  const ev = event as ExtendableEvent;
  ev.waitUntil(
    (self as unknown as { clients: { claim(): Promise<void> } }).clients.claim()
  );
});

sw.addEventListener("push", (event: Event) => {
  const ev = event as unknown as PushEventLike;
  if (!ev.data) return;

  let payload: { title: string; body: string; url?: string };
  try {
    payload = ev.data.json() as { title: string; body: string; url?: string };
  } catch {
    payload = { title: "Wafa", body: ev.data.text() };
  }

  ev.waitUntil(
    sw.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/brand/wafa-icon.png",
      badge: "/brand/wafa-icon-monochrome.png",
      data: { url: payload.url ?? "/" },
      vibrate: [100, 50, 100],
    })
  );
});

sw.addEventListener("notificationclick", (event: Event) => {
  const ev = event as unknown as NotificationClickLike;
  ev.notification.close();
  const data = ev.notification.data as { url?: string } | undefined;
  const url = data?.url ?? "/";
  ev.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          void client.focus();
          if (typeof client.navigate === "function") {
            void client.navigate(url);
          }
          return;
        }
      }
      return sw.clients.openWindow(url);
    })
  );
});
