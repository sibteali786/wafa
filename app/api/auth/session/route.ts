import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null, spacesCount: 0 });
  }

  const { count } = await supabase
    .from("space_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    spacesCount: count ?? 0,
  });
}
