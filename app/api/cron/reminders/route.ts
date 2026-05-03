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
