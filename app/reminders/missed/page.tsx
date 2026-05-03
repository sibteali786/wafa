import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FullPage } from "@/components/wafa/full-page";
import { TabBar } from "@/components/wafa/tab-bar";
import { ScreenHeader } from "@/components/wafa/screen-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function MissedRemindersPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nowIso = new Date().toISOString();
  const { data: rows } = await supabase
    .from("promises")
    .select("id, title, due_at, space_id, spaces(name)")
    .not("due_at", "is", null)
    .lt("due_at", nowIso)
    .neq("state", "fulfilled")
    .order("due_at", { ascending: true });

  return (
    <FullPage>
      <div className="flex min-h-screen flex-col pb-[calc(62px+env(safe-area-inset-bottom,0px))]">
        <ScreenHeader
          className="!px-0"
          title="Missed reminders"
          left={
            <Link
              href="/reminders"
              className="inline-flex h-7 w-7 items-center justify-center text-ink-secondary"
              aria-label="Back"
            >
              <ChevronLeft className="size-5 stroke-[1.8]" />
            </Link>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-4 pt-3">
          {rows?.length ? (
            rows.map((row) => (
              <Link
                key={row.id}
                href={`/promises/${row.id}`}
                className="rounded-lg border border-line-strong bg-card p-3"
              >
                <p className="text-sm font-medium text-foreground">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {(Array.isArray(row.spaces)
                    ? (row.spaces[0] as { name: string | null } | undefined)?.name
                    : row.spaces
                      ? (row.spaces as { name: string | null }).name
                      : null) || "Space"}{" "}
                  · due{" "}
                  {row.due_at ? new Date(row.due_at).toLocaleString() : "—"}
                </p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
          )}
        </div>
      </div>
      <TabBar active="reminders" />
    </FullPage>
  );
}

