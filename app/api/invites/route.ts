import { NextResponse } from "next/server";
import { generateInviteToken, hashInviteToken } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CreateInvitePayload = {
  spaceId?: string;
  intendedRole?: "member" | "admin";
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CreateInvitePayload;
  if (!payload.spaceId) {
    return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
  }

  const intendedRole = payload.intendedRole ?? "member";
  if (intendedRole !== "member" && intendedRole !== "admin") {
    return NextResponse.json({ error: "Invalid intended role" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: space, error: spaceError } = await admin
    .from("spaces")
    .select("id, space_type, created_by")
    .eq("id", payload.spaceId)
    .single();

  if (spaceError || !space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const { data: selfMembership } = await admin
    .from("space_members")
    .select("role")
    .eq("space_id", space.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const canCreateInvite =
    space.space_type === "group"
      ? selfMembership?.role === "admin"
      : space.created_by === user.id;

  if (!canCreateInvite) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);

  const { error: inviteError } = await admin.from("invite_links").insert({
    space_id: space.id,
    created_by: user.id,
    token_hash: tokenHash,
    intended_role: intendedRole,
    status: "pending",
  });

  if (inviteError) {
    return NextResponse.json(
      { error: inviteError.message ?? "Could not create invite" },
      { status: 400 }
    );
  }

  const inviteUrl = new URL(`/invite/${rawToken}`, request.url).toString();
  return NextResponse.json({ inviteUrl });
}

