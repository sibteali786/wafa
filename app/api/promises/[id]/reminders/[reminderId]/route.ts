import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Cadence = "once" | "daily" | "weekly" | "biweekly" | "monthly" | "every_n_days";
type UpdateReminderPayload = {
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
  next.setHours(args.hour, args.minute, 0, 0);
  if (next <= args.from) {
    next.setDate(next.getDate() + 1);
  }
  if (args.cadence === "weekly") next.setDate(next.getDate() + 6);
  if (args.cadence === "biweekly") next.setDate(next.getDate() + 13);
  if (args.cadence === "monthly") next.setMonth(next.getMonth() + 1);
  if (args.cadence === "every_n_days") next.setDate(next.getDate() + (args.everyNDays ?? 1) - 1);
  return next.toISOString();
}

async function authorize(
  promiseId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const { data: promiseRow } = await supabase
    .from("promises")
    .select("id, space_id")
    .eq("id", promiseId)
    .single();
  if (!promiseRow) return { ok: false as const };

  const { data: membership } = await supabase
    .from("space_members")
    .select("role")
    .eq("space_id", promiseRow.space_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return { ok: false as const };

  const { data: space } = await supabase
    .from("spaces")
    .select("space_type")
    .eq("id", promiseRow.space_id)
    .single();
  const canManage = space?.space_type === "one_to_one" || membership.role === "admin";
  return { ok: canManage as boolean };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; reminderId: string }> }
) {
  const { id: promiseId, reminderId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permission = await authorize(promiseId, user.id, supabase);
  if (!permission.ok) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const payload = (await request.json()) as UpdateReminderPayload;
  const cadence = payload.cadence ?? "once";
  const hour = payload.hour ?? 9;
  const minute = payload.minute ?? 0;
  const everyNDays = cadence === "every_n_days" ? payload.everyNDays ?? 1 : null;
  const nextRunAt = computeNextRunAt({ cadence, hour, minute, everyNDays, from: new Date() });

  const { data: updated, error } = await supabase
    .from("promise_reminders")
    .update({
      cadence,
      every_n_days: everyNDays,
      hour,
      minute,
      next_run_at: nextRunAt,
      active: true,
    })
    .eq("id", reminderId)
    .eq("promise_id", promiseId)
    .select("id, cadence, every_n_days, hour, minute, active")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Could not update reminder" }, { status: 400 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; reminderId: string }> }
) {
  const { id: promiseId, reminderId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permission = await authorize(promiseId, user.id, supabase);
  if (!permission.ok) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { error } = await supabase
    .from("promise_reminders")
    .delete()
    .eq("id", reminderId)
    .eq("promise_id", promiseId);

  if (error) {
    return NextResponse.json({ error: error.message ?? "Could not delete reminder" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

