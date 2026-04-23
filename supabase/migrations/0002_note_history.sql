-- Phase 3: note edit history (append-only snapshots)

create table if not exists public.promise_note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.promise_notes(id) on delete cascade,
  promise_id uuid not null references public.promises(id) on delete cascade,
  editor_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists idx_promise_note_versions_note_id
  on public.promise_note_versions(note_id, created_at desc);

create index if not exists idx_promise_note_versions_promise_id
  on public.promise_note_versions(promise_id, created_at desc);

create or replace function public.capture_note_version()
returns trigger
language plpgsql
as $$
begin
  insert into public.promise_note_versions (note_id, promise_id, editor_id, body)
  values (new.id, new.promise_id, auth.uid(), new.body);
  return new;
end;
$$;

drop trigger if exists trg_promise_note_versions_capture on public.promise_notes;
create trigger trg_promise_note_versions_capture
after insert or update on public.promise_notes
for each row
execute function public.capture_note_version();

alter table public.promise_note_versions enable row level security;

create policy "promise_note_versions_select"
on public.promise_note_versions for select
using (public.can_access_promise(promise_id));

create policy "promise_note_versions_insert_editor_only"
on public.promise_note_versions for insert
with check (
  editor_id = auth.uid()
  and public.can_access_promise(promise_id)
);

