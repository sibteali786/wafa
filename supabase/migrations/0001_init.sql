create extension if not exists pgcrypto;

-- Enums
create type public.space_type_enum as enum ('one_to_one', 'group');
create type public.space_role_enum as enum ('admin', 'member');
create type public.invite_status_enum as enum ('pending', 'used', 'revoked');
create type public.promise_state_enum as enum ('pending', 'fulfilled', 'snoozed');
create type public.reminder_cadence_enum as enum ('once', 'daily', 'weekly', 'biweekly', 'monthly', 'every_n_days');
create type public.attachment_kind_enum as enum ('image', 'audio', 'pdf', 'video');
create type public.attachment_status_enum as enum ('active', 'deleted');

-- Tables
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  timezone text not null default 'Asia/Karachi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  space_type space_type_enum not null,
  name text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role space_role_enum not null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create table public.invite_links (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  token_hash text not null unique,
  status invite_status_enum not null default 'pending',
  intended_role space_role_enum not null default 'member',
  used_by uuid references auth.users(id),
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.promises (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  due_at timestamptz,
  state promise_state_enum not null default 'pending',
  is_suggestion boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  fulfilled_at timestamptz,
  fulfilled_by uuid references auth.users(id),
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_suggestion or (state = 'pending' and approved_at is null and approved_by is null))
);

create table public.promise_notes (
  id uuid primary key default gen_random_uuid(),
  promise_id uuid not null references public.promises(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promise_attachments (
  id uuid primary key default gen_random_uuid(),
  promise_id uuid not null references public.promises(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  kind attachment_kind_enum not null,
  object_key text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  duration_seconds integer,
  status attachment_status_enum not null default 'active',
  created_at timestamptz not null default now(),
  check (
    (kind = 'image' and size_bytes <= 5242880)
    or ((kind = 'audio' or kind = 'pdf') and size_bytes <= 10485760)
    or (kind = 'video' and size_bytes <= 31457280)
  )
);

create table public.promise_reminders (
  id uuid primary key default gen_random_uuid(),
  promise_id uuid not null references public.promises(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  cadence reminder_cadence_enum not null,
  every_n_days integer check (every_n_days is null or every_n_days >= 1),
  hour smallint not null check (hour between 0 and 23),
  minute smallint not null check (minute between 0 and 59),
  start_date date not null,
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((cadence = 'every_n_days' and every_n_days is not null) or (cadence <> 'every_n_days' and every_n_days is null))
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_event_id text not null,
  entity_type text not null,
  entity_id uuid,
  operation text not null,
  status text not null check (status in ('applied', 'conflict', 'rejected')),
  server_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, client_event_id)
);

-- Indexes
create index idx_space_members_space_id on public.space_members(space_id);
create index idx_space_members_user_id on public.space_members(user_id);
create index idx_invite_links_space_status on public.invite_links(space_id, status);
create index idx_promises_space_id on public.promises(space_id);
create index idx_promises_created_by on public.promises(created_by);
create index idx_promises_due_at on public.promises(due_at);
create index idx_promise_notes_promise_id on public.promise_notes(promise_id);
create index idx_promise_attachments_promise_id on public.promise_attachments(promise_id);
create index idx_promise_reminders_promise_id on public.promise_reminders(promise_id);
create index idx_promise_reminders_next_run_at on public.promise_reminders(next_run_at) where active = true;
create index idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index idx_sync_events_user_id on public.sync_events(user_id);

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_spaces_updated_at before update on public.spaces for each row execute function public.set_updated_at();
create trigger trg_promises_updated_at before update on public.promises for each row execute function public.set_updated_at();
create trigger trg_promise_notes_updated_at before update on public.promise_notes for each row execute function public.set_updated_at();
create trigger trg_promise_reminders_updated_at before update on public.promise_reminders for each row execute function public.set_updated_at();
create trigger trg_push_subscriptions_updated_at before update on public.push_subscriptions for each row execute function public.set_updated_at();

-- Space membership integrity triggers
create or replace function public.enforce_space_member_constraints()
returns trigger
language plpgsql
as $$
declare
  v_space_type space_type_enum;
  v_member_count int;
  v_admin_count int;
begin
  select space_type into v_space_type
  from public.spaces
  where id = new.space_id;

  if v_space_type is null then
    raise exception 'Space does not exist';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into v_member_count
    from public.space_members
    where space_id = new.space_id;
  else
    select count(*) into v_member_count
    from public.space_members
    where space_id = new.space_id and id <> old.id;
  end if;

  if v_space_type = 'one_to_one' and v_member_count >= 2 then
    raise exception 'one_to_one spaces can only have 2 members';
  end if;

  if v_space_type = 'group' and new.role = 'admin' then
    if tg_op = 'INSERT' then
      select count(*) into v_admin_count
      from public.space_members
      where space_id = new.space_id and role = 'admin';
    else
      select count(*) into v_admin_count
      from public.space_members
      where space_id = new.space_id and role = 'admin' and id <> old.id;
    end if;

    if v_admin_count >= 1 then
      raise exception 'group spaces can only have one admin';
    end if;
  end if;

  if v_space_type = 'one_to_one' and new.role <> 'member' then
    raise exception 'one_to_one spaces only allow member role';
  end if;

  return new;
end;
$$;

create trigger trg_space_members_constraints
before insert or update on public.space_members
for each row
execute function public.enforce_space_member_constraints();

-- Attachment count limit trigger
create or replace function public.enforce_attachment_limit()
returns trigger
language plpgsql
as $$
declare
  v_count int;
begin
  select count(*)
  into v_count
  from public.promise_attachments
  where promise_id = new.promise_id
    and status = 'active';

  if v_count >= 5 then
    raise exception 'A promise can have at most 5 active attachments';
  end if;

  if new.kind = 'video' and new.duration_seconds is not null and new.duration_seconds > 30 then
    raise exception 'Video attachments must be 30 seconds or less';
  end if;

  return new;
end;
$$;

create trigger trg_promise_attachments_limit
before insert on public.promise_attachments
for each row
execute function public.enforce_attachment_limit();

-- RLS helper functions
create or replace function public.is_space_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members sm
    where sm.space_id = p_space_id
      and sm.user_id = auth.uid()
  );
$$;

create or replace function public.is_space_admin(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members sm
    where sm.space_id = p_space_id
      and sm.user_id = auth.uid()
      and sm.role = 'admin'
  );
$$;

create or replace function public.is_one_to_one(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.spaces s
    where s.id = p_space_id
      and s.space_type = 'one_to_one'
  );
$$;

create or replace function public.is_group(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.spaces s
    where s.id = p_space_id
      and s.space_type = 'group'
  );
$$;

create or replace function public.is_promise_creator(p_promise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.promises p
    where p.id = p_promise_id
      and p.created_by = auth.uid()
  );
$$;

create or replace function public.can_access_promise(p_promise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.promises p
    join public.space_members sm on sm.space_id = p.space_id
    where p.id = p_promise_id
      and sm.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_promise(p_promise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.promises p
    join public.spaces s on s.id = p.space_id
    left join public.space_members sm on sm.space_id = p.space_id and sm.user_id = auth.uid()
    where p.id = p_promise_id
      and (
        (s.space_type = 'one_to_one' and p.created_by = auth.uid())
        or (s.space_type = 'group' and sm.role = 'admin')
        or (s.space_type = 'group' and p.created_by = auth.uid() and p.is_suggestion = true and p.approved_at is null)
      )
  );
$$;

create or replace function public.can_add_content_to_promise(p_promise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.promises p
    join public.spaces s on s.id = p.space_id
    join public.space_members sm on sm.space_id = p.space_id and sm.user_id = auth.uid()
    where p.id = p_promise_id
      and (
        s.space_type = 'one_to_one'
        or (s.space_type = 'group' and (p.is_suggestion = false or p.approved_at is not null))
      )
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.invite_links enable row level security;
alter table public.promises enable row level security;
alter table public.promise_notes enable row level security;
alter table public.promise_attachments enable row level security;
alter table public.promise_reminders enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.sync_events enable row level security;

-- profiles
create policy "profiles_select_own"
on public.profiles for select
using (user_id = auth.uid());

create policy "profiles_upsert_own"
on public.profiles for insert
with check (user_id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- spaces
create policy "spaces_select_members"
on public.spaces for select
using (public.is_space_member(id));

create policy "spaces_insert_authenticated"
on public.spaces for insert
with check (auth.uid() is not null and created_by = auth.uid());

create policy "spaces_update_admin_only"
on public.spaces for update
using (public.is_space_admin(id))
with check (public.is_space_admin(id));

create policy "spaces_delete_admin_only"
on public.spaces for delete
using (public.is_space_admin(id));

-- space_members
create policy "space_members_select_members"
on public.space_members for select
using (public.is_space_member(space_id));

create policy "space_members_insert_self_bootstrap_or_admin"
on public.space_members for insert
with check (
  (
    user_id = auth.uid()
    and role = 'admin'
    and exists (
      select 1 from public.spaces s
      where s.id = space_id and s.created_by = auth.uid()
    )
  )
  or public.is_space_admin(space_id)
);

create policy "space_members_update_admin_only"
on public.space_members for update
using (public.is_space_admin(space_id))
with check (public.is_space_admin(space_id));

create policy "space_members_delete_admin_only"
on public.space_members for delete
using (
  public.is_space_admin(space_id)
  and public.is_group(space_id)
);

-- invite_links
create policy "invite_links_select_admin_only"
on public.invite_links for select
using (public.is_space_admin(space_id));

create policy "invite_links_insert_admin_only"
on public.invite_links for insert
with check (public.is_space_admin(space_id) and created_by = auth.uid());

create policy "invite_links_update_admin_only"
on public.invite_links for update
using (public.is_space_admin(space_id))
with check (public.is_space_admin(space_id));

create policy "invite_links_delete_admin_only"
on public.invite_links for delete
using (public.is_space_admin(space_id));

-- promises
create policy "promises_select_space_members"
on public.promises for select
using (public.is_space_member(space_id));

create policy "promises_insert_with_rules"
on public.promises for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and public.is_space_member(space_id)
  and (
    (
      public.is_one_to_one(space_id)
      and is_suggestion = false
    )
    or (
      public.is_group(space_id)
      and public.is_space_admin(space_id)
      and is_suggestion = false
    )
    or (
      public.is_group(space_id)
      and not public.is_space_admin(space_id)
      and is_suggestion = true
      and state = 'pending'
    )
  )
);

create policy "promises_update_with_rules"
on public.promises for update
using (
  public.can_edit_promise(id)
  or (
    public.is_one_to_one(space_id)
    and public.is_space_member(space_id)
  )
)
with check (
  public.can_edit_promise(id)
  or (
    public.is_one_to_one(space_id)
    and public.is_space_member(space_id)
  )
);

create policy "promises_delete_with_rules"
on public.promises for delete
using (
  (public.is_one_to_one(space_id) and created_by = auth.uid())
  or (public.is_group(space_id) and public.is_space_admin(space_id))
);

-- promise_notes
create policy "promise_notes_select"
on public.promise_notes for select
using (public.can_access_promise(promise_id));

create policy "promise_notes_insert"
on public.promise_notes for insert
with check (author_id = auth.uid() and public.can_add_content_to_promise(promise_id));

create policy "promise_notes_update"
on public.promise_notes for update
using (
  author_id = auth.uid()
  or exists (
    select 1
    from public.promises p
    where p.id = promise_id
      and public.is_group(p.space_id)
      and public.is_space_admin(p.space_id)
  )
)
with check (
  author_id = auth.uid()
  or exists (
    select 1
    from public.promises p
    where p.id = promise_id
      and public.is_group(p.space_id)
      and public.is_space_admin(p.space_id)
  )
);

create policy "promise_notes_delete"
on public.promise_notes for delete
using (
  author_id = auth.uid()
  or exists (
    select 1
    from public.promises p
    where p.id = promise_id
      and public.is_group(p.space_id)
      and public.is_space_admin(p.space_id)
  )
);

-- promise_attachments
create policy "promise_attachments_select"
on public.promise_attachments for select
using (public.can_access_promise(promise_id));

create policy "promise_attachments_insert"
on public.promise_attachments for insert
with check (uploaded_by = auth.uid() and public.can_add_content_to_promise(promise_id));

create policy "promise_attachments_delete"
on public.promise_attachments for delete
using (
  uploaded_by = auth.uid()
  or exists (
    select 1
    from public.promises p
    where p.id = promise_id
      and public.is_group(p.space_id)
      and public.is_space_admin(p.space_id)
  )
);

-- promise_reminders
create policy "promise_reminders_select"
on public.promise_reminders for select
using (
  exists (
    select 1
    from public.promises p
    where p.id = promise_id
      and public.is_space_member(p.space_id)
  )
);

create policy "promise_reminders_insert"
on public.promise_reminders for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.promises p
    where p.id = promise_id
      and (
        (public.is_one_to_one(p.space_id) and public.is_space_member(p.space_id))
        or (public.is_group(p.space_id) and public.is_space_admin(p.space_id))
      )
  )
);

create policy "promise_reminders_update"
on public.promise_reminders for update
using (
  exists (
    select 1
    from public.promises p
    where p.id = promise_id
      and (
        (public.is_one_to_one(p.space_id) and public.is_space_member(p.space_id))
        or (public.is_group(p.space_id) and public.is_space_admin(p.space_id))
      )
  )
)
with check (
  exists (
    select 1
    from public.promises p
    where p.id = promise_id
      and (
        (public.is_one_to_one(p.space_id) and public.is_space_member(p.space_id))
        or (public.is_group(p.space_id) and public.is_space_admin(p.space_id))
      )
  )
);

create policy "promise_reminders_delete"
on public.promise_reminders for delete
using (
  exists (
    select 1
    from public.promises p
    where p.id = promise_id
      and (
        (public.is_one_to_one(p.space_id) and public.is_space_member(p.space_id))
        or (public.is_group(p.space_id) and public.is_space_admin(p.space_id))
      )
  )
);

-- push_subscriptions
create policy "push_subscriptions_select_own"
on public.push_subscriptions for select
using (user_id = auth.uid());

create policy "push_subscriptions_insert_own"
on public.push_subscriptions for insert
with check (user_id = auth.uid());

create policy "push_subscriptions_update_own"
on public.push_subscriptions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
on public.push_subscriptions for delete
using (user_id = auth.uid());

-- sync_events
create policy "sync_events_select_own"
on public.sync_events for select
using (user_id = auth.uid());

create policy "sync_events_insert_own"
on public.sync_events for insert
with check (user_id = auth.uid());
