import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppViewport } from "@/components/wafa/app-viewport";
import { ScreenHeader } from "@/components/wafa/screen-header";

export default async function RemindersPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();
  const { data: missed } = await supabase
    .from("promises")
    .select("id")
    .not("due_at", "is", null)
    .lt("due_at", nowIso)
    .neq("state", "fulfilled");

  return (
    <AppViewport showTabBar activeTab="reminders">
      <ScreenHeader layout="main" title="Reminders" crumb="PKT schedule" />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[18px] pb-4 pt-4">
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          Reminders are configured per promise. Use missed reminders as fallback when push is blocked/offline.
        </p>
        <Link
          href="/reminders/missed"
          className="rounded-lg border border-line-strong bg-card px-3 py-2 text-sm text-foreground"
        >
          Missed reminders ({missed?.length ?? 0})
        </Link>
      </div>
    </AppViewport>
  );
}
