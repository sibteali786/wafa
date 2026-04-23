import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { PromiseRowActions } from "@/components/promise-row-actions";
import { FullPage } from "@/components/wafa/full-page";
import { Fab } from "@/components/wafa/fab";
import { TabBar } from "@/components/wafa/tab-bar";
import { RowItem } from "@/components/wafa/row-item";
import { ScreenHeader } from "@/components/wafa/screen-header";
import { SpaceInvitePanel } from "@/components/space-invite-panel";
import { SpaceDetailTabs } from "@/components/space-detail-tabs";
import { WafaAvatar } from "@/components/wafa/wafa-avatar";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SpacePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ first?: string; tone?: string; inviteFor?: string }>;
};

export default async function SpaceDetailPage({ params, searchParams }: SpacePageProps) {
  const { id } = await params;
  const qs = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("space_members")
    .select("role")
    .eq("space_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) notFound();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, space_type")
    .eq("id", id)
    .single();

  if (!space) notFound();

  const { data: members } = await supabase
    .from("space_members")
    .select("user_id, role")
    .eq("space_id", id);

  const { data: promises } = await supabase
    .from("promises")
    .select("id, title, created_by, state, due_at, is_suggestion")
    .eq("space_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const memberCount = members?.length ?? 0;
  const open = (promises ?? []).filter((promise) => promise.state !== "fulfilled");
  const suggestions = open.filter((promise) => promise.is_suggestion);
  const nowIso = new Date().toISOString();

  const isGroup = space.space_type === "group";
  const isAdmin = membership.role === "admin";
  const firstVisit = qs.first === "1";
  const inviteFor = qs.inviteFor ? decodeURIComponent(qs.inviteFor) : "them";

  return (
    <FullPage>
      <div className="flex min-h-screen flex-col pb-[calc(62px+env(safe-area-inset-bottom,0px))]">
      <ScreenHeader
        layout="main"
        className="!px-4"
        crumb={isGroup ? `Group · ${memberCount} members` : "Space · 1:1"}
        title={space.name || (isGroup ? "Group" : "1:1 Space")}
        right={
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-line-strong bg-card text-ink-secondary hover:bg-muted/40"
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4 stroke-[1.8]" />
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4 pt-3">
        {firstVisit && !isGroup ? (
          <SpaceInvitePanel spaceId={space.id} inviteForLabel={inviteFor} />
        ) : null}

        {firstVisit && isGroup ? (
          <div className="space-y-2 rounded-xl border border-line-strong bg-card p-3">
            <p className="text-[13px] font-medium text-foreground">Your group is ready.</p>
            <Link
              href="#invite"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
            >
              Invite your first member
            </Link>
          </div>
        ) : null}

        {isGroup && isAdmin ? (
          <section className="space-y-2">
            <div className="text-[11px] font-medium text-warn-ink">Needs your approval · {suggestions.length}</div>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <Link key={suggestion.id} href={`/promises/${suggestion.id}`}>
                  <RowItem
                    className="border-warn-border bg-warn-bg"
                    title={suggestion.title}
                    sub="Suggested promise"
                    trailing={<PromiseRowActions promiseId={suggestion.id} mode="approve-reject" />}
                  />
                </Link>
              ))}
              {suggestions.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">No pending suggestions.</p>
              ) : null}
            </div>
            <div className="flex -space-x-2 pt-1">
              {(members ?? []).slice(0, 4).map((member, index) => (
                <WafaAvatar
                  key={member.user_id}
                  initials={`M${index + 1}`}
                  size="sm"
                  tone={index % 2 === 0 ? "teal" : "coral"}
                  className="border-2 border-background"
                />
              ))}
            </div>
          </section>
        ) : null}
        <SpaceDetailTabs promises={promises ?? []} nowIso={nowIso} />
      </div>

      <Fab href={`/promises/new?spaceId=${space.id}`} aria-label="Create promise" />
      </div>
      <TabBar active="home" />
    </FullPage>
  );
}

