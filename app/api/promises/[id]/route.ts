import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PromiseAction =
  | "fulfill"
  | "reopen"
  | "snooze"
  | "unsnooze"
  | "approve"
  | "reject";

type UpdatePromisePayload = {
  title?: string;
  description?: string | null;
  dueAt?: string | null;
  assignedTo?: string | null;
  action?: PromiseAction;
  snoozeOption?: "1h" | "later_today" | "tomorrow" | "3d";
};

function computeSnoozeUntil(option: UpdatePromisePayload["snoozeOption"]) {
  const now = new Date();
  if (option === "1h") {
    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
  if (option === "later_today") {
    const later = new Date(now);
    later.setHours(21, 0, 0, 0);
    if (later <= now) {
      later.setDate(later.getDate() + 1);
      later.setHours(9, 0, 0, 0);
    }
    return later.toISOString();
  }
  if (option === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
  }
  const after3Days = new Date(now);
  after3Days.setDate(after3Days.getDate() + 3);
  return after3Days.toISOString();
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as UpdatePromisePayload;

  if (payload.action) {
    if (payload.action === "reject") {
      const { error } = await supabase.from("promises").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (payload.action === "fulfill") {
      const { error } = await supabase
        .from("promises")
        .update({
          state: "fulfilled",
          fulfilled_at: new Date().toISOString(),
          fulfilled_by: user.id,
          snoozed_until: null,
        })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (payload.action === "reopen") {
      const { error } = await supabase
        .from("promises")
        .update({
          state: "pending",
          fulfilled_at: null,
          fulfilled_by: null,
        })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (payload.action === "snooze") {
      const snoozedUntil = computeSnoozeUntil(payload.snoozeOption ?? "1h");
      const { error } = await supabase
        .from("promises")
        .update({
          state: "snoozed",
          snoozed_until: snoozedUntil,
        })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, snoozedUntil });
    }

    if (payload.action === "unsnooze") {
      const { error } = await supabase
        .from("promises")
        .update({
          state: "pending",
          snoozed_until: null,
        })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (payload.action === "approve") {
      const { error } = await supabase
        .from("promises")
        .update({
          is_suggestion: false,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
  }

  const updates: Record<string, string | null> = {};
  if (payload.title !== undefined) updates.title = payload.title.trim();
  if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
  if (payload.dueAt !== undefined) updates.due_at = payload.dueAt || null;
  if (payload.assignedTo !== undefined) updates.assigned_to = payload.assignedTo || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { error } = await supabase.from("promises").update(updates).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { error } = await supabase.from("promises").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

