import { NextResponse } from "next/server";
import { hashInviteToken } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type InviteRow = {
  id: string;
  space_id: string;
  intended_role: "admin" | "member";
  status: "pending" | "used" | "revoked";
};

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const tokenHash = hashInviteToken(token);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: invite, error: inviteError } = await admin
    .from("invite_links")
    .select("id, space_id, intended_role, status")
    .eq("token_hash", tokenHash)
    .maybeSingle<InviteRow>();

  if (inviteError || !invite || invite.status !== "pending") {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  const { data: existingMember } = await admin
    .from("space_members")
    .select("id")
    .eq("space_id", invite.space_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMember) {
    const { error: memberError } = await admin.from("space_members").insert({
      space_id: invite.space_id,
      user_id: user.id,
      role: invite.intended_role,
    });

    if (memberError) {
      return NextResponse.json(
        { error: memberError.message ?? "Could not join space" },
        { status: 400 }
      );
    }
  }

  const { error: updateError } = await admin
    .from("invite_links")
    .update({
      status: "used",
      used_by: user.id,
      used_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .eq("status", "pending");

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message ?? "Could not consume invite" },
      { status: 400 }
    );
  }

  return NextResponse.json({ spaceId: invite.space_id });
}

