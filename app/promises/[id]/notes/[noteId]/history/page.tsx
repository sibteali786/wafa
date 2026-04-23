import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FullPage } from "@/components/wafa/full-page";
import { ScreenHeader } from "@/components/wafa/screen-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type NoteHistoryPageProps = {
  params: Promise<{ id: string; noteId: string }>;
};

export default async function NoteHistoryPage({ params }: NoteHistoryPageProps) {
  const { id, noteId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: versions } = await supabase
    .from("promise_note_versions")
    .select("id, body, created_at")
    .eq("promise_id", id)
    .eq("note_id", noteId)
    .order("created_at", { ascending: false });

  return (
    <FullPage>
      <div className="flex min-h-screen flex-col">
        <ScreenHeader
          className="!px-0"
          title="Note history"
          left={
            <Link
              href={`/promises/${id}`}
              className="inline-flex h-7 w-7 items-center justify-center text-ink-secondary"
              aria-label="Back"
            >
              <ChevronLeft className="size-5 stroke-[1.8]" />
            </Link>
          }
        />
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-6 pt-4">
          {versions?.length ? (
            versions.map((version) => (
              <article key={version.id} className="rounded-lg border border-line-strong bg-card p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  {new Date(version.created_at).toLocaleString()}
                </p>
                <pre className="whitespace-pre-wrap break-words font-mono text-xs text-foreground">
                  {version.body}
                </pre>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          )}
        </div>
      </div>
    </FullPage>
  );
}

