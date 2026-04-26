"use client";

import { useEffect, useState, useTransition } from "react";
import { useOfflineSync } from "@/components/offline/sync-status-provider";
import { buttonVariants } from "@/components/ui/button";
import { BottomSheet } from "@/components/wafa/bottom-sheet";
import { WafaToast } from "@/components/wafa/wafa-toast";
import { cn } from "@/lib/utils";

type Reminder = {
  id: string;
  cadence: string;
  everyNDays: number | null;
  hour: number;
  minute: number;
};

type PromiseReminderPickerProps = {
  promiseId: string;
  initialReminder: Reminder | null;
};

type Cadence = "once" | "daily" | "weekly" | "biweekly" | "monthly" | "every_n_days";

function formatReminder(reminder: Reminder | null) {
  if (!reminder) return "No reminder";
  const hh = String(reminder.hour).padStart(2, "0");
  const mm = String(reminder.minute).padStart(2, "0");
  if (reminder.cadence === "every_n_days") {
    return `Every ${reminder.everyNDays ?? 1} days · ${hh}:${mm}`;
  }
  return `${reminder.cadence.replace("_", "-")} · ${hh}:${mm}`;
}

export function PromiseReminderPicker({ promiseId, initialReminder }: PromiseReminderPickerProps) {
  const { isOnline } = useOfflineSync();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reminder, setReminder] = useState<Reminder | null>(initialReminder);
  const [cadence, setCadence] = useState<Cadence>((initialReminder?.cadence as Cadence) || "once");
  const [time, setTime] = useState(
    `${String(initialReminder?.hour ?? 9).padStart(2, "0")}:${String(initialReminder?.minute ?? 0).padStart(2, "0")}`
  );
  const [everyNDays, setEveryNDays] = useState<number>(initialReminder?.everyNDays ?? 3);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(timer);
  }, [success]);

  function save() {
    setError(null);
    setSuccess(null);
    const [hour, minute] = time.split(":").map((value) => Number(value));

    startTransition(async () => {
      if (!isOnline) {
        setError("You're offline. Reminder changes can't be saved right now.");
        setOpen(false);
        return;
      }
      const payload = {
        cadence,
        hour,
        minute,
        everyNDays: cadence === "every_n_days" ? everyNDays : null,
      };
      const endpoint = reminder
        ? `/api/promises/${promiseId}/reminders/${reminder.id}`
        : `/api/promises/${promiseId}/reminders`;
      const method = reminder ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Could not save reminder.");
        return;
      }

      const saved = (await response.json()) as {
        id: string;
        cadence: string;
        every_n_days: number | null;
        hour: number;
        minute: number;
      };
      setReminder({
        id: saved.id,
        cadence: saved.cadence,
        everyNDays: saved.every_n_days,
        hour: saved.hour,
        minute: saved.minute,
      });
      setSuccess(reminder ? "Reminder updated" : "Reminder set");
      setOpen(false);
    });
  }

  function remove() {
    if (!reminder) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      if (!isOnline) {
        setError("You're offline. Can't remove reminder right now.");
        setOpen(false);
        return;
      }
      const response = await fetch(`/api/promises/${promiseId}/reminders/${reminder.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Could not remove reminder.");
        return;
      }
      setReminder(null);
      setSuccess("Reminder removed");
      setOpen(false);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-foreground">{formatReminder(reminder)}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={buttonVariants({ variant: "wireGhost", size: "sm" })}
        >
          {reminder ? "Edit" : "Add reminder"}
        </button>
      </div>

      {error ? <WafaToast variant="coral">{error}</WafaToast> : null}
      {success ? <WafaToast>{success}</WafaToast> : null}

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Reminder"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className={cn(buttonVariants({ variant: "cta", size: "cta" }), "flex-1")}
            >
              Save
            </button>
            {reminder ? (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className={cn(buttonVariants({ variant: "wireGhost", size: "cta" }), "flex-1 text-coral-ink")}
              >
                Remove
              </button>
            ) : null}
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[11px] text-muted-foreground">Cadence</span>
            <select
              value={cadence}
              onChange={(event) => setCadence(event.target.value as Cadence)}
              className="h-10 w-full rounded-lg border border-line-strong bg-background px-3 text-sm text-foreground"
            >
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="every_n_days">Every N days</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] text-muted-foreground">Time (PKT)</span>
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="h-10 w-full rounded-lg border border-line-strong bg-background px-3 text-sm text-foreground"
            />
          </label>

          {cadence === "every_n_days" ? (
            <label className="block space-y-1">
              <span className="text-[11px] text-muted-foreground">Every how many days</span>
              <input
                type="number"
                min={1}
                value={everyNDays}
                onChange={(event) => setEveryNDays(Number(event.target.value) || 1)}
                className="h-10 w-full rounded-lg border border-line-strong bg-background px-3 text-sm text-foreground"
              />
            </label>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}

