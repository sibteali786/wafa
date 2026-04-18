import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake, Settings } from "lucide-react";
import { AppViewport } from "@/components/wafa/app-viewport";
import { HomeEmptyActions } from "@/components/home-empty-actions";
import { RowItem } from "@/components/wafa/row-item";
import { ScreenHeader } from "@/components/wafa/screen-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function signedInCrumb(email: string) {
  const local = email.split("@")[0] ?? email;
  return `Signed in as ${local}@…`;
}

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

  const n = count ?? 0;
  const email = user.email ?? "";

  return (
    <AppViewport showTabBar activeTab="home">
      <ScreenHeader
        layout="main"
        title="Spaces"
        crumb={signedInCrumb(email)}
        right={
          <Link
            href="/me"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-line-strong bg-card text-ink-secondary hover:bg-muted/40"
            aria-label="Settings"
          >
            <Settings className="size-4 stroke-[1.8]" />
          </Link>
        }
      />
      <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[18px] pb-4 pt-2">
        {n === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 pb-8 pt-10 text-center">
            <div className="flex size-[88px] items-center justify-center rounded-[22px] border border-[#cbe0d9] bg-gradient-to-br from-primary-soft to-sand text-primary-ink">
              <Handshake className="size-9 stroke-[1.5]" aria-hidden />
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">You haven&apos;t made a space yet</h3>
            <p className="max-w-[220px] text-[12px] leading-snug text-muted-foreground">
              A space holds promises between you and one person, or a small group. Everything inside it stays
              private to its members.
            </p>
            <div className="mt-3 flex w-full max-w-[260px] flex-col items-center gap-3">
              <HomeEmptyActions />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-[12px] text-muted-foreground">
              You belong to {n} space{n === 1 ? "" : "s"}. Full listing arrives in Phase 2.
            </p>
            <RowItem title="Example space" sub="Placeholder — connect to data in Phase 2" />
            <RowItem title="Another space" sub="Placeholder" />
          </div>
        )}
      </div>
    </AppViewport>
  );
}
