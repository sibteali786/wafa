-- Phase 3: note edit history (append-only snapshots)

alter table public.promise_notes
  add column if not exists edit_count integer not null default 0;

create table if not exists public.note_history (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.promise_notes(id) on delete cascade,
  promise_id uuid not null references public.promises(id) on delete cascade,
  editor_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists idx_note_history_note_id
  on public.note_history(note_id, created_at desc);

create index if not exists idx_note_history_promise_id
  on public.note_history(promise_id, created_at desc);

alter table public.note_history enable row level security;

create policy "note_history_select"
on public.note_history for select
using (public.can_access_promise(promise_id));

create policy "note_history_insert_editor_only"
on public.note_history for insert
with check (
  editor_id = auth.uid()
  and public.can_access_promise(promise_id)
);

