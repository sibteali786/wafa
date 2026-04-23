import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CreatePromisePayload = {
  spaceId?: string;
  title?: string;
  description?: string;
  dueAt?: string | null;
  assignedTo?: string | null;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CreatePromisePayload;
  const title = payload.title?.trim() ?? "";
  if (!payload.spaceId) {
    return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data: membership, error: memberError } = await supabase
    .from("space_members")
    .select("role")
    .eq("space_id", payload.spaceId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership) {
    return NextResponse.json({ error: "Not a member of this space" }, { status: 403 });
  }

  const isSuggestion = membership.role !== "admin";
  const { data: inserted, error: insertError } = await supabase
    .from("promises")
    .insert({
      space_id: payload.spaceId,
      created_by: user.id,
      assigned_to: payload.assignedTo || null,
      title,
      description: payload.description?.trim() || null,
      due_at: payload.dueAt || null,
      is_suggestion: isSuggestion,
      state: "pending",
    })
    .select("id, space_id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not create promise" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id: inserted.id,
    spaceId: inserted.space_id,
    isSuggestion,
  });
}

