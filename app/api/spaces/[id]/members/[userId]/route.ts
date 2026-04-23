import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = {
  id: string;
  userId: string;
};

export async function DELETE(
  _request: Request,
  context: { params: Promise<Params> }
) {
  const { id: spaceId, userId } = await context.params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: space, error: spaceError } = await admin
    .from("spaces")
    .select("id, space_type")
    .eq("id", spaceId)
    .maybeSingle();

  if (spaceError || !space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  if (space.space_type !== "group") {
    return NextResponse.json({ error: "Member management is only available in groups" }, { status: 400 });
  }

  const { data: selfMembership, error: selfMembershipError } = await admin
    .from("space_members")
    .select("role")
    .eq("space_id", spaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selfMembershipError || selfMembership?.role !== "admin") {
    return NextResponse.json({ error: "Only group admins can remove members" }, { status: 403 });
  }

  if (userId === user.id) {
    return NextResponse.json({ error: "Admin cannot remove themselves" }, { status: 400 });
  }

  const { data: targetMembership, error: targetMembershipError } = await admin
    .from("space_members")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (targetMembershipError || !targetMembership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const { error: removeError } = await admin
    .from("space_members")
    .delete()
    .eq("id", targetMembership.id);

  if (removeError) {
    return NextResponse.json({ error: removeError.message ?? "Could not remove member" }, { status: 400 });
  }

  const { error: revokeError } = await admin
    .from("invite_links")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("space_id", spaceId)
    .eq("status", "pending")
    .or(`used_by.eq.${userId},intended_for_user_id.eq.${userId}`);

  if (revokeError) {
    return NextResponse.json({ error: revokeError.message ?? "Member removed, invite revoke failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
