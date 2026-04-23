"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WafaToast } from "@/components/wafa/wafa-toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NoteItem = {
  id: string;
  body: string;
  editCount: number;
  updatedAt: string;
};

type PromiseNotesPanelProps = {
  promiseId: string;
  initialNotes: NoteItem[];
};

export function PromiseNotesPanel({ promiseId, initialNotes }: PromiseNotesPanelProps) {
  const [notes, setNotes] = useState<NoteItem[]>(
    [...initialNotes].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
  );
  const [newBody, setNewBody] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>(
    () =>
      initialNotes.reduce<Record<string, string>>((acc, note) => {
        acc[note.id] = note.body;
        return acc;
      }, {})
  );
  const [createPending, setCreatePending] = useState(false);
  const [pendingByNoteId, setPendingByNoteId] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(timer);
  }, [success]);

  function setDraft(noteId: string, value: string) {
    setDrafts((prev) => ({ ...prev, [noteId]: value }));
  }

  function sortByServerUpdatedAt(nextNotes: NoteItem[]) {
    return [...nextNotes].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
  }

  function createNote() {
    const body = newBody.trim();
    if (!body) return;
    setError(null);
    setSuccess(null);
    const tempId = `tmp-${Date.now()}`;
    const optimistic: NoteItem = {
      id: tempId,
      body,
      editCount: 0,
      updatedAt: "",
    };

    setNotes((prev) => [optimistic, ...prev]);
    setDraft(tempId, body);
    setNewBody("");
    setCreatePending(true);
    setPendingByNoteId((prev) => ({ ...prev, [tempId]: true }));
    (async () => {
      const response = await fetch(`/api/promises/${promiseId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setNotes((prev) => prev.filter((note) => note.id !== tempId));
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        setError(payload.error ?? "Could not save note.");
        setCreatePending(false);
        setPendingByNoteId((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        return;
      }

      const saved = (await response.json()) as {
        id: string;
        body: string;
        edit_count: number;
        updated_at: string;
      };
      setNotes((prev) =>
        sortByServerUpdatedAt(
          prev.map((note) =>
            note.id === tempId
              ? {
                  id: saved.id,
                  body: saved.body,
                  editCount: saved.edit_count ?? 0,
                  updatedAt: saved.updated_at,
                }
              : note
          )
        )
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[tempId];
        next[saved.id] = saved.body;
        return next;
      });
      setPendingByNoteId((prev) => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
      setCreatePending(false);
      setSuccess("Note added");
    })();
  }

  function updateNote(noteId: string) {
    const before = notes.find((note) => note.id === noteId);
    if (!before) return;
    const nextBody = (drafts[noteId] ?? "").trim();
    if (!nextBody || nextBody === before.body) return;

    setError(null);
    setSuccess(null);
    setPendingByNoteId((prev) => ({ ...prev, [noteId]: true }));
    setNotes((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, body: nextBody } : note))
    );

    (async () => {
      const response = await fetch(`/api/promises/${promiseId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: nextBody }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setNotes((prev) =>
          prev.map((note) => (note.id === noteId ? { ...note, body: before.body } : note))
        );
        setDraft(noteId, before.body);
        setError(payload.error ?? "Could not update note.");
        setPendingByNoteId((prev) => {
          const next = { ...prev };
          delete next[noteId];
          return next;
        });
        return;
      }

      const saved = (await response.json()) as {
        id: string;
        body: string;
        edit_count: number;
        updated_at: string;
      };
      setNotes((prev) =>
        sortByServerUpdatedAt(
          prev.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  body: saved.body,
                  editCount: saved.edit_count ?? note.editCount,
                  updatedAt: saved.updated_at,
                }
              : note
          )
        )
      );
      setDraft(noteId, saved.body);
      setPendingByNoteId((prev) => {
        const next = { ...prev };
        delete next[noteId];
        return next;
      });
      setSuccess("Note saved");
    })();
  }

  function deleteNote(noteId: string) {
    const existingIndex = notes.findIndex((note) => note.id === noteId);
    if (existingIndex < 0) return;
    const existing = notes[existingIndex];
    setError(null);
    setSuccess(null);
    setPendingByNoteId((prev) => ({ ...prev, [noteId]: true }));

    setNotes((prev) => prev.filter((note) => note.id !== noteId));

    (async () => {
      const response = await fetch(`/api/promises/${promiseId}/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setNotes((prev) => {
          const copy = [...prev];
          copy.splice(existingIndex, 0, existing);
          return copy;
        });
        setError(payload.error ?? "Could not delete note.");
      } else {
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[noteId];
          return next;
        });
        setSuccess("Note removed");
      }
      setPendingByNoteId((prev) => {
        const next = { ...prev };
        delete next[noteId];
        return next;
      });
    })();
  }

  return (
    <section className="space-y-3 rounded-lg border border-line-strong bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Notes</p>

      <div className="space-y-2 rounded-lg border border-line-strong bg-background p-2">
        <textarea
          value={newBody}
          onChange={(event) => setNewBody(event.target.value)}
          placeholder="Add a note"
          className="min-h-20 w-full rounded border border-line-strong bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={createNote}
          disabled={createPending || newBody.trim().length === 0}
          className={buttonVariants({ variant: "cta", size: "sm" })}
        >
          Add note
        </button>
      </div>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className={cn(
                "space-y-2 rounded-lg border border-line-strong bg-background p-2 transition-opacity",
                pendingByNoteId[note.id] && "opacity-60"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">edited {note.editCount}×</p>
                {!note.id.startsWith("tmp-") ? (
                  <Link
                    href={`/promises/${promiseId}/notes/${note.id}/history`}
                    className="text-[11px] text-primary underline"
                  >
                    history
                  </Link>
                ) : null}
              </div>
              <textarea
                value={drafts[note.id] ?? note.body}
                onChange={(event) => setDraft(note.id, event.target.value)}
                className="min-h-20 w-full rounded border border-line-strong bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateNote(note.id)}
                  disabled={Boolean(pendingByNoteId[note.id]) || note.id.startsWith("tmp-")}
                  className={buttonVariants({ variant: "wireGhost", size: "sm" })}
                >
                  {pendingByNoteId[note.id] ? "Saving…" : "Update"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteNote(note.id)}
                  disabled={Boolean(pendingByNoteId[note.id]) || note.id.startsWith("tmp-")}
                  className={cn(buttonVariants({ variant: "wireGhost", size: "sm" }), "text-coral-ink")}
                >
                  {pendingByNoteId[note.id] ? "..." : "Delete"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {error ? <WafaToast variant="coral">{error}</WafaToast> : null}
      {success ? <WafaToast>{success}</WafaToast> : null}
    </section>
  );
}

