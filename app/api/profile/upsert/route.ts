import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type UpsertProfilePayload = {
  displayName?: string;
  timezone?: string;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const payload = (await request.json()) as UpsertProfilePayload;
  const displayName = payload.displayName?.trim();
  const timezone = payload.timezone?.trim() || "Asia/Karachi";

  if (!displayName) {
    return NextResponse.json(
      { error: "displayName is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: displayName,
      timezone,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
