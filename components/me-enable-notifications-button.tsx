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
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
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
        console.error("Subscribe API failed", await res.text());
        return;
      }
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
        const res = await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        if (!res.ok) {
          console.error("Unsubscribe API failed", await res.text());
        }
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
