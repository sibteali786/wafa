import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Cadence = "once" | "daily" | "weekly" | "biweekly" | "monthly" | "every_n_days";
type CreateReminderPayload = {
  cadence?: Cadence;
  hour?: number;
  minute?: number;
  everyNDays?: number | null;
};

function computeNextRunAt(args: {
  cadence: Cadence;
  hour: number;
  minute: number;
  everyNDays: number | null;
  from: Date;
}) {
  const next = new Date(args.from);

  // hour/minute are stored in PKT (UTC+5), so convert to UTC before writing next_run_at.
  const utcHour = args.hour - 5;
  next.setUTCHours(((utcHour % 24) + 24) % 24, args.minute, 0, 0);
  if (utcHour < 0) {
    next.setUTCDate(next.getUTCDate() - 1);
  }

  if (next <= args.from) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  if (args.cadence === "weekly") next.setUTCDate(next.getUTCDate() + 6);
  if (args.cadence === "biweekly") next.setUTCDate(next.getUTCDate() + 13);
  if (args.cadence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  if (args.cadence === "every_n_days") next.setUTCDate(next.getUTCDate() + (args.everyNDays ?? 1) - 1);
  return next.toISOString();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: promiseId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CreateReminderPayload;
  const cadence = payload.cadence ?? "once";
  const hour = payload.hour ?? 9;
  const minute = payload.minute ?? 0;
  const everyNDays = cadence === "every_n_days" ? payload.everyNDays ?? 1 : null;

  const { data: promiseRow, error: promiseError } = await supabase
    .from("promises")
    .select("id, space_id")
    .eq("id", promiseId)
    .single();

  if (promiseError || !promiseRow) {
    return NextResponse.json({ error: "Promise not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("space_members")
    .select("role")
    .eq("space_id", promiseRow.space_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { data: space } = await supabase
    .from("spaces")
    .select("space_type")
    .eq("id", promiseRow.space_id)
    .single();
  const canManage = space?.space_type === "one_to_one" || membership.role === "admin";
  if (!canManage) {
    return NextResponse.json({ error: "Only admins can set reminders in groups" }, { status: 403 });
  }

  await supabase
    .from("promise_reminders")
    .update({ active: false })
    .eq("promise_id", promiseId)
    .eq("active", true);

  const now = new Date();
  const nextRunAt = computeNextRunAt({ cadence, hour, minute, everyNDays, from: now });
  const startDate = now.toISOString().slice(0, 10);

  const { data: inserted, error } = await supabase
    .from("promise_reminders")
    .insert({
      promise_id: promiseId,
      created_by: user.id,
      cadence,
      every_n_days: everyNDays,
      hour,
      minute,
      start_date: startDate,
      next_run_at: nextRunAt,
      active: true,
    })
    .select("id, cadence, every_n_days, hour, minute, active")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Could not create reminder" }, { status: 400 });
  }
  return NextResponse.json(inserted);
}

