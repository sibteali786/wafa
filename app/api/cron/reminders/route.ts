import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/webpush";

type ReminderCadence = "once" | "daily" | "weekly" | "biweekly" | "monthly" | "every_n_days";

function computeNextRunAt(args: {
  cadence: ReminderCadence;
  hour: number;
  minute: number;
  everyNDays: number | null;
  base: Date;
}): string | null {
  if (args.cadence === "once") return null;

  // Start from base date and advance by cadence
  const next = new Date(args.base);
  if (args.cadence === "daily") next.setUTCDate(next.getUTCDate() + 1);
  if (args.cadence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (args.cadence === "biweekly") next.setUTCDate(next.getUTCDate() + 14);
  if (args.cadence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  if (args.cadence === "every_n_days") next.setUTCDate(next.getUTCDate() + (args.everyNDays ?? 1));

  // hour/minute are in PKT (UTC+5) — convert to UTC by subtracting 5 hours
  const utcHour = args.hour - 5;

  // Set the time in UTC accounting for PKT offset
  // If utcHour goes negative, it means the time is on the previous UTC day
  next.setUTCHours(((utcHour % 24) + 24) % 24, args.minute, 0, 0);

  // If utcHour was negative, we need to go back a day
  if (utcHour < 0) {
    next.setUTCDate(next.getUTCDate() - 1);
  }

  return next.toISOString();
}

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const nextRunAt = computeNextRunAt({
      cadence: reminder.cadence as ReminderCadence,
      hour: reminder.hour,
      minute: reminder.minute,
      everyNDays: reminder.every_n_days,
      base: new Date(),
    });

    const { data: promise } = await admin
      .from("promises")
      .select("id, title, space_id, spaces(name, space_type)")
      .eq("id", reminder.promise_id)
      .maybeSingle();

    if (promise) {
      const { data: members } = await admin.from("space_members").select("user_id").eq("space_id", promise.space_id);

      const userIds = (members ?? []).map((m) => m.user_id);

      const { data: subs } =
        userIds.length > 0
          ? await admin
              .from("push_subscriptions")
              .select("id, endpoint, p256dh, auth")
              .in("user_id", userIds)
          : { data: [] as { id: string; endpoint: string; p256dh: string; auth: string }[] };

      const rawSpace = promise.spaces;
      const space = (
        Array.isArray(rawSpace) ? rawSpace[0] : rawSpace
      ) as { name: string | null; space_type: string } | null | undefined;
      const spaceLabel = space?.name ?? (space?.space_type === "one_to_one" ? "Your space" : "Group");
      const notifPayload = {
        title: `Reminder: ${promise.title}`,
        body: spaceLabel,
        url: `/promises/${promise.id}`,
      };

      const expiredIds: string[] = [];
      for (const sub of subs ?? []) {
        const result = await sendPush(sub, notifPayload);
        if (result === "expired") expiredIds.push(sub.id);
      }
      if (expiredIds.length > 0) {
        await admin.from("push_subscriptions").delete().in("id", expiredIds);
      }
    }

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
