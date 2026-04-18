import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type UpsertProfilePayload = {
  displayName?: string;
  timezone?: string;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!accessToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
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

  const supabase = createAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: userData.user.id,
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
