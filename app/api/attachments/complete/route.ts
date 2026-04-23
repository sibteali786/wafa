import { NextResponse } from "next/server";
import { getAttachmentRule } from "@/lib/attachments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CompleteAttachmentPayload = {
  promiseId?: string;
  objectKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationSeconds?: number | null;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CompleteAttachmentPayload;
  if (!payload.promiseId || !payload.objectKey || !payload.mimeType || !payload.sizeBytes) {
    return NextResponse.json(
      { error: "promiseId, objectKey, mimeType and sizeBytes are required" },
      { status: 400 }
    );
  }

  const rule = getAttachmentRule(payload.mimeType);
  if (!rule) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (payload.sizeBytes <= 0 || payload.sizeBytes > rule.maxBytes) {
    return NextResponse.json({ error: "File is too large for this type" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: promiseRow, error: promiseError } = await admin
    .from("promises")
    .select("id, space_id")
    .eq("id", payload.promiseId)
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

  const { data: inserted, error: insertError } = await admin
    .from("promise_attachments")
    .insert({
      promise_id: payload.promiseId,
      uploaded_by: user.id,
      kind: rule.kind,
      object_key: payload.objectKey,
      mime_type: payload.mimeType,
      size_bytes: payload.sizeBytes,
      duration_seconds: payload.durationSeconds ?? null,
      status: "active",
    })
    .select("id, promise_id, uploaded_by, kind, object_key, mime_type, size_bytes, duration_seconds, status, created_at")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message ?? "Could not save attachment" }, { status: 400 });
  }

  return NextResponse.json(inserted);
}
