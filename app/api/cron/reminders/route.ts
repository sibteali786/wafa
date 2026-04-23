import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ReminderCadence = "once" | "daily" | "weekly" | "biweekly" | "monthly" | "every_n_days";

function computeNextRunAt(args: {
  cadence: ReminderCadence;
  hour: number;
  minute: number;
  everyNDays: number | null;
  base: Date;
}) {
  const next = new Date(args.base);

  if (args.cadence === "once") return null;
  if (args.cadence === "daily") next.setDate(next.getDate() + 1);
  if (args.cadence === "weekly") next.setDate(next.getDate() + 7);
  if (args.cadence === "biweekly") next.setDate(next.getDate() + 14);
  if (args.cadence === "monthly") next.setMonth(next.getMonth() + 1);
  if (args.cadence === "every_n_days") next.setDate(next.getDate() + (args.everyNDays ?? 1));

  next.setHours(args.hour, args.minute, 0, 0);
  return next.toISOString();
}

/**
 * Phase 3 skeleton only:
 * - fetch due reminder rows
 * - iterate algorithm
 * - advance next_run_at / deactivate once cadence
 * No Vercel cron config or Web Push dispatch is wired here yet.
 */
export async function GET() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: dueReminders, error } = await admin
    .from("promise_reminders")
    .select("id, promise_id, cadence, every_n_days, hour, minute, next_run_at, active")
    .eq("active", true)
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  let deactivated = 0;

  for (const reminder of dueReminders ?? []) {
    // In Phase 4 this is where push dispatch + missed-reminder recording will be wired.
    const nextRunAt = computeNextRunAt({
      cadence: reminder.cadence as ReminderCadence,
      hour: reminder.hour,
      minute: reminder.minute,
      everyNDays: reminder.every_n_days,
      base: new Date(),
    });

    if (nextRunAt === null) {
      await admin
        .from("promise_reminders")
        .update({
          active: false,
          last_run_at: nowIso,
        })
        .eq("id", reminder.id);
      deactivated += 1;
    } else {
      await admin
        .from("promise_reminders")
        .update({
          next_run_at: nextRunAt,
          last_run_at: nowIso,
        })
        .eq("id", reminder.id);
    }
    processed += 1;
  }

  return NextResponse.json({
    ok: true,
    processed,
    deactivated,
    scanned: dueReminders?.length ?? 0,
  });
}

