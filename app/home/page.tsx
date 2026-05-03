import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake, Plus, Settings } from "lucide-react";
import { AppViewport } from "@/components/wafa/app-viewport";
import { HomeEmptyActions } from "@/components/home-empty-actions";
import { WafaAvatar } from "@/components/wafa/wafa-avatar";
import { RowItem } from "@/components/wafa/row-item";
import { ScreenHeader } from "@/components/wafa/screen-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const revalidate = 30;

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

  const { data: memberRows } = await supabase
    .from("space_members")
    .select("role, space_id, spaces(id, name, space_type)")
    .eq("user_id", user.id);

  const spaceRows =
    memberRows
      ?.map((row) => {
        const space = Array.isArray(row.spaces) ? row.spaces[0] : row.spaces;
        if (!space?.id) return null;
        return {
          id: space.id as string,
          role: row.role as "admin" | "member",
          name: (space.name as string | null) ?? "Untitled space",
          spaceType: space.space_type as "one_to_one" | "group",
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? [];

  const spaceIds = spaceRows.map((space) => space.id);

  const { data: promiseRows } =
    spaceIds.length > 0
      ? await supabase
          .from("promises")
          .select("space_id, state, due_at, is_suggestion")
          .in("space_id", spaceIds)
      : { data: [] };

  const nowIso = new Date().toISOString();
  const statsBySpace = new Map<string, { open: number; overdue: number }>();
  for (const space of spaceRows) {
    statsBySpace.set(space.id, { open: 0, overdue: 0 });
  }
  for (const promise of promiseRows ?? []) {
    const stats = statsBySpace.get(promise.space_id as string);
    if (!stats) continue;
    if (promise.is_suggestion) continue;
    const isFulfilled = promise.state === "fulfilled";
    if (!isFulfilled) {
      stats.open += 1;
    }
    if (
      !isFulfilled &&
      promise.state !== "snoozed" &&
      promise.due_at &&
      promise.due_at < nowIso
    ) {
      stats.overdue += 1;
    }
  }

  const oneToOneSpaces = spaceRows.filter((space) => space.spaceType === "one_to_one");
  const groupSpaces = spaceRows.filter((space) => space.spaceType === "group");

  const n = count ?? 0;
  const email = user.email ?? "";

  return (
    <AppViewport showTabBar activeTab="home">
      <ScreenHeader
        layout="main"
        title="Spaces"
        crumb={signedInCrumb(email)}
        right={
          <div className="flex items-center gap-2">
            <Link
              href="/spaces/new"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-line-strong bg-card text-ink-secondary hover:bg-muted/40"
              aria-label="Create new space"
            >
              <Plus className="size-4 stroke-[1.8]" />
            </Link>
            <Link
              href="/me"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-line-strong bg-card text-ink-secondary hover:bg-muted/40"
              aria-label="Settings"
            >
              <Settings className="size-4 stroke-[1.8]" />
            </Link>
          </div>
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
          <div className="flex flex-col gap-4 py-2">
            <section className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                1:1 spaces
              </p>
              <div className="space-y-2">
                {oneToOneSpaces.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">No 1:1 spaces yet.</p>
                ) : (
                  oneToOneSpaces.map((space) => {
                    const stats = statsBySpace.get(space.id) ?? { open: 0, overdue: 0 };
                    return (
                      <Link
                        key={space.id}
                        href={`/spaces/${space.id}`}
                        className="block transition-colors duration-150 active:opacity-70"
                      >
                        <RowItem
                          leading={<WafaAvatar initials={space.name.slice(0, 2)} tone="coral" />}
                          title={space.name}
                          sub={`${stats.open} open${stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ""}`}
                          trailing={
                            stats.overdue > 0 ? (
                              <span className="inline-flex items-center rounded-full border border-warn-border bg-warn-bg px-2 py-0.5 text-[10px] font-medium text-warn-ink">
                                overdue
                              </span>
                            ) : null
                          }
                        />
                      </Link>
                    );
                  })
                )}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Groups</p>
              <div className="space-y-2">
                {groupSpaces.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">No groups yet.</p>
                ) : (
                  groupSpaces.map((space) => {
                    const stats = statsBySpace.get(space.id) ?? { open: 0, overdue: 0 };
                    return (
                      <Link
                        key={space.id}
                        href={`/spaces/${space.id}`}
                        className="block transition-colors duration-150 active:opacity-70"
                      >
                        <RowItem
                          leading={<WafaAvatar initials={space.name.slice(0, 2)} tone="teal" />}
                          title={space.name}
                          sub={`${stats.open} open${stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ""}`}
                          trailing={
                            <span className="inline-flex items-center rounded-full border border-line-strong bg-card px-2 py-0.5 text-[10px] font-medium text-ink-secondary">
                              {space.role}
                            </span>
                          }
                        />
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </AppViewport>
  );
}
