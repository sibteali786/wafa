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

  return (
    <AppViewport showTabBar activeTab="reminders">
      <ScreenHeader layout="main" title="Reminders" crumb="Coming in Phase 2" />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[18px] pb-4 pt-4">
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          Missed reminders and push fallbacks will show here. This screen is a placeholder for Phase 1 UI
          shell only.
        </p>
        <Link href="/home" className="text-sm text-primary underline">
          Back to home
        </Link>
      </div>
    </AppViewport>
  );
}
