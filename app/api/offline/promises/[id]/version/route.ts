import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = { id: string };

export async function GET(
  _request: Request,
  context: { params: Promise<Params> }
) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: promiseRow, error: promiseError } = await admin
    .from("promises")
    .select("id, space_id, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (promiseError || !promiseRow) {
    return NextResponse.json({ error: "Promise not found" }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await admin
    .from("space_members")
    .select("id")
    .eq("space_id", promiseRow.space_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError || !membership) {
    return NextResponse.json({ error: "Not a member of this space" }, { status: 403 });
  }

  return NextResponse.json({ updatedAt: promiseRow.updated_at });
}

