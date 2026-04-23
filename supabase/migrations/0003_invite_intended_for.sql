alter table public.invite_links
add column intended_for_user_id uuid references auth.users(id);

create index idx_invite_links_space_intended_for
on public.invite_links(space_id, intended_for_user_id);
