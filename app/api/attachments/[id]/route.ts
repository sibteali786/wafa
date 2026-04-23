import { NextResponse } from "next/server";
import { deleteObjectFromR2 } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = { id: string };

export async function DELETE(
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
    .select("id, object_key, uploaded_by, promise_id, status")
    .eq("id", id)
    .maybeSingle();
  if (attachmentError || !attachment || attachment.status !== "active") {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const { data: promiseRow, error: promiseError } = await admin
    .from("promises")
    .select("id, space_id")
    .eq("id", attachment.promise_id)
    .maybeSingle();
  if (promiseError || !promiseRow) {
    return NextResponse.json({ error: "Promise not found" }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await admin
    .from("space_members")
    .select("role")
    .eq("space_id", promiseRow.space_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError || !membership) {
    return NextResponse.json({ error: "Not a member of this space" }, { status: 403 });
  }

  const canDelete = attachment.uploaded_by === user.id || membership.role === "admin";
  if (!canDelete) {
    return NextResponse.json({ error: "Only uploader or group admin can delete attachment" }, { status: 403 });
  }

  const { error: deleteDbError } = await admin.from("promise_attachments").delete().eq("id", attachment.id);
  if (deleteDbError) {
    return NextResponse.json({ error: deleteDbError.message ?? "Could not delete attachment" }, { status: 400 });
  }

  try {
    await deleteObjectFromR2(attachment.object_key);
  } catch (error) {
    console.error("R2 attachment delete failed", error);
  }

  return NextResponse.json({ ok: true });
}
