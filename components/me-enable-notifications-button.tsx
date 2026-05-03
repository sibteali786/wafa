"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getActiveServiceWorker(): Promise<ServiceWorkerRegistration> {
  // Try getting existing registration first
  const existing = await navigator.serviceWorker.getRegistration("/");

  if (existing?.active) return existing;

  // If installing or waiting, give it 15s to activate
  const reg = existing ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));

  if (reg.active) return reg;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error("Service worker activation timed out. Try closing and reopening the app.")
        ),
      15_000
    );

    const worker = reg.installing ?? reg.waiting;
    if (!worker) {
      clearTimeout(timeout);
      reject(new Error("No service worker found."));
      return;
    }

    worker.addEventListener("statechange", function handler() {
      if (this.state === "activated") {
        clearTimeout(timeout);
        worker.removeEventListener("statechange", handler);
        resolve(reg);
      } else if (this.state === "redundant") {
        clearTimeout(timeout);
        worker.removeEventListener("statechange", handler);
        reject(new Error("Service worker became redundant."));
      }
    });
  });
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
        alert("Notifications blocked. Please allow them in your device Settings → Wafa → Notifications.");
        return;
      }

      const reg = await getActiveServiceWorker();

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        alert("Configuration error. Please contact support.");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        alert("Failed to save notification subscription. Please try again.");
        return;
      }

      setEnabled(true);
    } catch (err) {
      console.error("Push subscribe error", err);
      alert(err instanceof Error ? err.message : "Could not enable notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const existing = await navigator.serviceWorker.getRegistration("/");
      const sub = await existing?.pushManager.getSubscription();
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

  if (typeof window !== "undefined" && !("PushManager" in window)) {
    return (
      <p className="text-sm text-muted-foreground mt-2">
        Push notifications require the app to be installed. In Safari, tap Share → Add to Home Screen, then reopen from your home screen.
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
