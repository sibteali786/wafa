import { NextResponse } from "next/server";
import { createSignedDownloadUrl } from "@/lib/r2";
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
  const { data: attachment, error: attachmentError } = await admin
    .from("promise_attachments")
    .select("id, object_key, status, promise_id")
    .eq("id", id)
    .maybeSingle();
  if (attachmentError || !attachment || attachment.status !== "active") {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const { data: promiseRow, error: promiseError } = await admin
    .from("promises")
    .select("space_id")
    .eq("id", attachment.promise_id)
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

  const url = await createSignedDownloadUrl(attachment.object_key);
  return NextResponse.json({ url });
}
