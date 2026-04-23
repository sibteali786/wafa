import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type UpdateNotePayload = {
  body?: string;
};

async function canEditOrDelete(
  promiseId: string,
  noteId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const { data: noteRow } = await supabase
    .from("promise_notes")
    .select("id, body, author_id, promise_id, edit_count")
    .eq("id", noteId)
    .eq("promise_id", promiseId)
    .single();

  if (!noteRow) return { ok: false as const, reason: "Note not found" };

  const { data: promiseRow } = await supabase
    .from("promises")
    .select("id, space_id")
    .eq("id", promiseId)
    .single();

  if (!promiseRow) return { ok: false as const, reason: "Promise not found" };

  const { data: membership } = await supabase
    .from("space_members")
    .select("role")
    .eq("space_id", promiseRow.space_id)
    .eq("user_id", userId)
    .maybeSingle();

  const isAuthor = noteRow.author_id === userId;
  const isGroupAdmin = membership?.role === "admin";
  if (!isAuthor && !isGroupAdmin) {
    return { ok: false as const, reason: "Not allowed" };
  }

  return {
    ok: true as const,
    note: noteRow,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  const { id: promiseId, noteId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as UpdateNotePayload;
  const body = payload.body?.trim() ?? "";
  if (!body) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const permission = await canEditOrDelete(promiseId, noteId, user.id, supabase);
  if (!permission.ok) {
    return NextResponse.json({ error: permission.reason }, { status: permission.reason === "Not allowed" ? 403 : 404 });
  }

  const { error: historyError } = await supabase.from("note_history").insert({
    note_id: permission.note.id,
    promise_id: promiseId,
    editor_id: user.id,
    body: permission.note.body,
  });

  if (historyError) {
    return NextResponse.json(
      { error: historyError.message ?? "Could not write note history" },
      { status: 400 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("promise_notes")
    .update({
      body,
      edit_count: (permission.note.edit_count ?? 0) + 1,
    })
    .eq("id", noteId)
    .eq("promise_id", promiseId)
    .select("id, promise_id, body, edit_count, updated_at")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Could not update note" },
      { status: 400 }
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  const { id: promiseId, noteId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await canEditOrDelete(promiseId, noteId, user.id, supabase);
  if (!permission.ok) {
    return NextResponse.json({ error: permission.reason }, { status: permission.reason === "Not allowed" ? 403 : 404 });
  }

  const { error } = await supabase
    .from("promise_notes")
    .delete()
    .eq("id", noteId)
    .eq("promise_id", promiseId);

  if (error) {
    return NextResponse.json({ error: error.message ?? "Could not delete note" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

