import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { count } = await supabase
    .from("space_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">My spaces</h1>
          <p className="text-zinc-600">
            {count && count > 0
              ? `You belong to ${count} space${count > 1 ? "s" : ""}.`
              : "No spaces yet. Create one to get started."}
          </p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm">
            Log out
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-zinc-600">
        Phase 1 complete: auth and profile foundation is ready. Spaces UI comes in
        Phase 2.
      </div>

      <Link href="/" className="text-sm font-medium text-zinc-900 underline">
        Back to landing page
      </Link>
    </main>
  );
}
