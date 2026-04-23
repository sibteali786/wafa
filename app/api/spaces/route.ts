import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CreateSpacePayload = {
  spaceType?: "one_to_one" | "group";
  name?: string;
  avatarTone?: "coral" | "sand" | "teal" | "sky";
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CreateSpacePayload;
  const spaceType = payload.spaceType;
  const trimmedName = payload.name?.trim() ?? "";
  const name = trimmedName.length > 0 ? trimmedName : null;

  if (spaceType !== "one_to_one" && spaceType !== "group") {
    return NextResponse.json({ error: "Invalid space type" }, { status: 400 });
  }

  if (spaceType === "group" && !name) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: insertedSpace, error: spaceError } = await admin
    .from("spaces")
    .insert({
      space_type: spaceType,
      name,
      created_by: user.id,
    })
    .select("id, space_type, name")
    .single();

  if (spaceError || !insertedSpace) {
    return NextResponse.json(
      { error: spaceError?.message ?? "Failed to create space" },
      { status: 400 }
    );
  }

  const creatorRole = spaceType === "group" ? "admin" : "member";

  const { error: memberError } = await admin.from("space_members").insert({
    space_id: insertedSpace.id,
    user_id: user.id,
    role: creatorRole,
  });

  if (memberError) {
    await admin.from("spaces").delete().eq("id", insertedSpace.id);
    return NextResponse.json(
      { error: memberError.message ?? "Failed to add creator membership" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id: insertedSpace.id,
    spaceType: insertedSpace.space_type,
    name: insertedSpace.name,
    avatarTone: payload.avatarTone ?? "teal",
  });
}

