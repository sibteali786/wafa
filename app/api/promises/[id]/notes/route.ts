import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CreateNotePayload = {
  body?: string;
};

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

  const payload = (await request.json()) as CreateNotePayload;
  const body = payload.body?.trim() ?? "";
  if (!body) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

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
    .select("id")
    .eq("space_id", promiseRow.space_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { data: inserted, error } = await supabase
    .from("promise_notes")
    .insert({
      promise_id: promiseId,
      author_id: user.id,
      body,
      edit_count: 0,
    })
    .select("id, promise_id, body, edit_count, updated_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Could not create note" }, { status: 400 });
  }

  return NextResponse.json(inserted);
}

