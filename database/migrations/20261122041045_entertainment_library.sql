-- REVIEW ONLY. Not a migration runner input. Apply separately only after approval.
-- Additive: no existing table/policy/data is changed. Do not replay old migrations.
begin;
create table public.entertainment_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  media text not null check (media in ('movie','show','game')),
  status text not null default 'planned' check (status in ('planned','in_progress','finished','dropped')),
  tags text[] not null default '{}' check (cardinality(tags) <= 12 and array_position(tags, null) is null and length(array_to_string(tags, ',')) <= 491),
  priority smallint not null default 1 check (priority between 0 and 2),
  platform text not null default '' check (length(platform) <= 120),
  minutes integer check (minutes between 1 and 10000),
  note text not null default '' check (length(note) <= 1000),
  season integer check (season between 1 and 10000),
  episode integer check (episode between 1 and 10000),
  progress text not null default '' check (length(progress) <= 500),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  check (media = 'show' or (season is null and episode is null)),
  check (media = 'game' or progress = '')
);
create index entertainment_items_owner_created on public.entertainment_items(user_id, created_at desc);
alter table public.entertainment_items enable row level security;
revoke all on public.entertainment_items from public, anon, authenticated;
grant select, insert, update, delete on public.entertainment_items to authenticated;
create policy entertainment_select on public.entertainment_items for select to authenticated using ((select auth.uid()) = user_id);
create policy entertainment_insert on public.entertainment_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy entertainment_update on public.entertainment_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy entertainment_delete on public.entertainment_items for delete to authenticated using ((select auth.uid()) = user_id);
commit;
