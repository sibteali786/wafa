import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HomeSpacesPhase2Stubs } from "@/components/home-spaces-phase2-stubs";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
          <button className={buttonVariants({ variant: "outline", size: "sm" })}>Log out</button>
        </form>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Phase 1 complete</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Auth and profile foundation is ready. Below are Phase 2 UI stubs (forms
          and invite dialog) ready to connect to data.
        </CardContent>
      </Card>

      <HomeSpacesPhase2Stubs />

      <Link href="/" className={buttonVariants({ variant: "link", size: "sm" })}>
        Back to landing page
      </Link>
    </main>
  );
}
