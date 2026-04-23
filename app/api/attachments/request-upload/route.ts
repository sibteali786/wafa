import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getAttachmentRule,
  MAX_ATTACHMENTS_PER_PROMISE,
  sanitizeFilename,
} from "@/lib/attachments";
import { createSignedUploadUrl } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RequestUploadPayload = {
  promiseId?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as RequestUploadPayload;
  if (!payload.promiseId || !payload.filename || !payload.mimeType || !payload.sizeBytes) {
    return NextResponse.json(
      { error: "promiseId, filename, mimeType and sizeBytes are required" },
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

  const { count: activeCount, error: countError } = await admin
    .from("promise_attachments")
    .select("*", { count: "exact", head: true })
    .eq("promise_id", payload.promiseId)
    .eq("status", "active");
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 });
  }
  if ((activeCount ?? 0) >= MAX_ATTACHMENTS_PER_PROMISE) {
    return NextResponse.json({ error: "A promise can have at most 5 attachments" }, { status: 400 });
  }

  const safeName = sanitizeFilename(payload.filename);
  const objectKey = `spaces/${promiseRow.space_id}/promises/${payload.promiseId}/${randomUUID()}-${safeName}`;
  const uploadUrl = await createSignedUploadUrl(objectKey, payload.mimeType);

  return NextResponse.json({ uploadUrl, objectKey });
}
