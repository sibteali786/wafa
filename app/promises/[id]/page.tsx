import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PromiseAttachmentsPanel } from "@/components/promise-attachments-panel";
import { PromiseDetailActions } from "@/components/promise-detail-actions";
import { PromiseDetailMoreActions } from "@/components/promise-detail-more-actions";
import { PromiseNotesPanel } from "@/components/promise-notes-panel";
import { PromiseReminderPicker } from "@/components/promise-reminder-picker";
import { FullPage } from "@/components/wafa/full-page";
import { ScreenHeader } from "@/components/wafa/screen-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PromiseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PromiseDetailPage({ params }: PromiseDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: promise } = await supabase
    .from("promises")
    .select("id, title, description, due_at, state, space_id, snoozed_until, created_by, assigned_to")
    .eq("id", id)
    .single();

  if (!promise) notFound();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, space_type")
    .eq("id", promise.space_id)
    .single();
  const { data: membership } = await supabase
    .from("space_members")
    .select("role, user_id")
    .eq("space_id", promise.space_id);
  const memberIds = membership?.map((m) => m.user_id) ?? [];
  const { data: profiles } =
    memberIds.length > 0
      ? await supabase.from("profiles").select("user_id, display_name").in("user_id", memberIds)
      : { data: [] };
  const memberOptions = memberIds.map((memberId) => {
    const profile = profiles?.find((p) => p.user_id === memberId);
    return {
      id: memberId,
      label: profile?.display_name ?? "Member",
    };
  });

  const selfMembership = membership?.find((m) => m.user_id === user.id);
  const canManagePromise =
    space?.space_type === "one_to_one" ? promise.created_by === user.id : selfMembership?.role === "admin";
  const { data: notes } = await supabase
    .from("promise_notes")
    .select("id, body, edit_count, updated_at")
    .eq("promise_id", promise.id)
    .order("updated_at", { ascending: false });

  const { data: reminder } = await supabase
    .from("promise_reminders")
    .select("id, cadence, every_n_days, hour, minute, active")
    .eq("promise_id", promise.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: attachments } = await supabase
    .from("promise_attachments")
    .select("id, kind, mime_type, size_bytes, created_at, status")
    .eq("promise_id", promise.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const stateLabel =
    promise.state === "fulfilled" ? "Fulfilled" : promise.state === "snoozed" ? "Snoozed" : "Pending";

  return (
    <FullPage>
      <div className="flex min-h-screen flex-col">
        <ScreenHeader
          className="!px-0"
          title="Promise"
          left={
            <Link
              href={`/spaces/${promise.space_id}`}
              className="inline-flex h-7 w-7 items-center justify-center text-ink-secondary"
              aria-label="Back"
            >
              <ChevronLeft className="size-5 stroke-[1.8]" />
            </Link>
          }
          right={
            <PromiseDetailMoreActions
              promiseId={promise.id}
              spaceId={promise.space_id}
              canManage={Boolean(canManagePromise)}
              members={memberOptions}
              initialValues={{
                title: promise.title,
                description: promise.description,
                dueAt: promise.due_at,
                assignedTo: promise.assigned_to,
              }}
            />
          }
        />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6 pt-4">
          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">{space?.name || "Space"}</p>
            <h1 className="text-xl font-semibold text-foreground">{promise.title}</h1>
            <p className="mt-1 inline-flex rounded-full border border-line-strong bg-card px-2 py-0.5 text-[11px] text-ink-secondary">
              {stateLabel}
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-line-strong bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Description</p>
            <p className="text-sm text-foreground">{promise.description || "No description"}</p>
          </div>

          <PromiseNotesPanel
            promiseId={promise.id}
            initialNotes={
              notes?.map((note) => ({
                id: note.id,
                body: note.body,
                editCount: note.edit_count ?? 0,
                updatedAt: note.updated_at,
              })) ?? []
            }
          />

          <PromiseAttachmentsPanel
            promiseId={promise.id}
            initialAttachments={
              attachments?.map((attachment) => ({
                id: attachment.id,
                kind: attachment.kind as "image" | "audio" | "pdf" | "video",
                mimeType: attachment.mime_type,
                sizeBytes: attachment.size_bytes,
                createdAt: attachment.created_at,
              })) ?? []
            }
          />

          <div className="space-y-2 rounded-lg border border-line-strong bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Due</p>
            <p className="text-sm text-foreground">
              {promise.due_at
                ? new Date(promise.due_at).toLocaleString("en-PK", {
                    timeZone: "Asia/Karachi",
                  })
                : "No due date"}
            </p>
            {promise.state === "snoozed" && promise.snoozed_until ? (
              <p className="text-xs text-muted-foreground">
                Snoozed until {new Date(promise.snoozed_until).toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-line-strong bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Reminder</p>
            <PromiseReminderPicker
              promiseId={promise.id}
              initialReminder={
                reminder
                  ? {
                      id: reminder.id,
                      cadence: reminder.cadence,
                      everyNDays: reminder.every_n_days,
                      hour: reminder.hour,
                      minute: reminder.minute,
                    }
                  : null
              }
            />
          </div>

          <PromiseDetailActions
            promiseId={promise.id}
            state={promise.state as "pending" | "fulfilled" | "snoozed"}
          />
        </div>
      </div>
    </FullPage>
  );
}

