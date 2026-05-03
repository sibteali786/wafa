import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { AppViewport } from "@/components/wafa/app-viewport";
import { ScreenHeader } from "@/components/wafa/screen-header";
import { MeDisplayNameField } from "@/components/me-display-name-field";
import { EnableNotificationsButton } from "@/components/me-enable-notifications-button";

const labelClass =
  "text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground";

const valueClass = "text-[13px] text-foreground";

const hintClass = "text-[11px] text-muted-foreground";

export default async function MePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
    user.email?.split("@")[0] ||
    "You";
  const email = user.email ?? "—";

  const { data: subRow } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const notificationsEnabled = !!subRow;

  return (
    <AppViewport showTabBar activeTab="me">
      <ScreenHeader layout="main" title="Profile" crumb="Account" />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-[18px] pb-4 pt-2">
        <MeDisplayNameField initialName={displayName} />

        <div className="space-y-1">
          <p className={labelClass}>Email</p>
          <p className={valueClass}>{email}</p>
        </div>

        <div className="space-y-1">
          <p className={labelClass}>Timezone</p>
          <p className={valueClass}>Asia/Karachi (PKT)</p>
          <p className={hintClass}>Timezone editing coming soon</p>
        </div>

        <div className="space-y-1">
          <p className={labelClass}>Push notifications</p>
          <p className={valueClass}>
            {notificationsEnabled ? "Enabled on this device" : "Not yet enabled"}
          </p>
          <EnableNotificationsButton initialEnabled={notificationsEnabled} />
        </div>

        <form action="/api/auth/logout" method="post" className="mt-2">
          <button
            type="submit"
            className={buttonVariants({ variant: "wireGhost", size: "cta", className: "w-full" })}
          >
            Log out
          </button>
        </form>
      </div>
    </AppViewport>
  );
}
