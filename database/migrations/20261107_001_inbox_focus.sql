-- REVIEW BEFORE RUNNING. Apply once in Supabase SQL Editor as the database owner.
-- Adds two tables and one RPC. Does not alter existing tables, rows, or policies.
-- A duplicate table name stops and rolls back this migration; do not drop data to retry.
begin;

create table public.inbox_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 20000),
  archived_at timestamptz,
  converted_task_id uuid unique,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inbox_conversion_pair check ((converted_at is null) = (converted_task_id is null))
);
-- Keep conversion history even after the task is deleted: no cascading task FK.
-- The RPC below is the only app-accessible writer of conversion columns.
create index inbox_notes_owner_created_idx on public.inbox_notes(user_id, created_at desc);
alter table public.inbox_notes enable row level security;
create policy "Read own captures" on public.inbox_notes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Create own captures" on public.inbox_notes for insert to authenticated
  with check ((select auth.uid()) = user_id and converted_task_id is null and converted_at is null);
create policy "Edit own captures" on public.inbox_notes for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.inbox_notes from public, anon, authenticated;
grant select on public.inbox_notes to authenticated;
grant insert (id, user_id, body) on public.inbox_notes to authenticated;
grant update (body, archived_at, updated_at) on public.inbox_notes to authenticated;

create table public.daily_focus (
  user_id uuid primary key references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  focus_date date not null,
  updated_at timestamptz not null default now()
);
alter table public.daily_focus enable row level security;
create policy "Read own focus" on public.daily_focus for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Set own focus" on public.daily_focus for insert to authenticated
  with check ((select auth.uid()) = user_id and (task_id is null or exists (
    select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())
  )));
create policy "Change own focus" on public.daily_focus for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (task_id is null or exists (
    select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())
  )));
revoke all on public.daily_focus from public, anon, authenticated;
grant select, insert, update on public.daily_focus to authenticated;

create function public.convert_inbox_note(
  p_note_id uuid,
  p_title text,
  p_description text,
  p_priority text,
  p_due_at timestamptz,
  p_project_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  capture public.inbox_notes%rowtype;
  saved_task public.tasks%rowtype;
begin
  if actor is null then
    raise exception 'Sign in before converting a capture' using errcode = '42501';
  end if;

  -- Serializes requests for the same note, including requests from other tabs.
  select * into capture from public.inbox_notes
    where id = p_note_id and user_id = actor for update;
  if not found then
    raise exception 'Capture not found for this account' using errcode = 'P0002';
  end if;

  if capture.converted_at is not null then
    select * into saved_task from public.tasks
      where id = capture.converted_task_id and user_id = actor;
    -- A deleted task stays deleted; replay never recreates it.
    return jsonb_build_object('note', to_jsonb(capture), 'task',
      case when saved_task.id is null then null else to_jsonb(saved_task) end);
  end if;

  if capture.archived_at is not null then
    raise exception 'Restore the capture before converting it' using errcode = '22023';
  end if;
  if p_title is null or length(btrim(p_title)) = 0 then
    raise exception 'A task title is required' using errcode = '22023';
  end if;
  if p_priority is null or p_priority not in ('low', 'medium', 'high', 'urgent') then
    raise exception 'Choose a valid priority' using errcode = '22023';
  end if;
  if p_project_id is not null and not exists (
    select 1 from public.projects where id = p_project_id and user_id = actor and status <> 'archived'
  ) then
    raise exception 'Choose an available project from your account' using errcode = '23503';
  end if;

  -- Populate a typed record so text-backed checks and enum-backed task fields
  -- both work, without guessing or changing the existing column types.
  insert into public.tasks (id, user_id, title, description, status, priority, due_at, project_id)
    select t.id, t.user_id, t.title, t.description, t.status, t.priority, t.due_at, t.project_id
    from jsonb_populate_record(null::public.tasks, jsonb_build_object(
      'id', gen_random_uuid(), 'user_id', actor, 'title', btrim(p_title),
      'description', btrim(coalesce(p_description, '')), 'status', 'todo',
      'priority', p_priority, 'due_at', p_due_at, 'project_id', p_project_id
    )) t
    returning * into saved_task;

  update public.inbox_notes
    set converted_task_id = saved_task.id, converted_at = now(), updated_at = now()
    where id = capture.id and user_id = actor returning * into capture;
  return jsonb_build_object('note', to_jsonb(capture), 'task', to_jsonb(saved_task));
end;
$$;
-- This narrowly scoped function elevates privileges only after explicit owner
-- checks. No caller-supplied user_id, dynamic SQL, or service-role key is used.
revoke all on function public.convert_inbox_note(uuid, text, text, text, timestamptz, uuid) from public, anon;
grant execute on function public.convert_inbox_note(uuid, text, text, text, timestamptz, uuid) to authenticated;

commit;
