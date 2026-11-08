-- REVIEW ONLY. Apply once as database owner after inspecting docs/inspect-journal.sql.
-- Additive: no changes to Inbox/task tables, policies, source content or reminders.
-- A conflicting existing table/function name aborts and rolls back; do not drop data to retry.
begin;
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  body text not null check(length(btrim(body,E' \n\r\t'))>0 and length(body)<=100000),
  revision bigint not null default 1 check(revision>=1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,entry_date)
);
-- No cascading entry/note FKs: receipts retain the original destination if either is removed.
-- Only owned RPCs below create links; clients cannot write/retarget them.
create table public.journal_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null,
  entry_id uuid not null,
  entry_date date not null,
  added_at timestamptz not null default now(),
  unique(user_id,note_id)
);
create index journal_sources_entry_owner_idx on public.journal_sources(user_id,entry_id);
create table public.journal_write_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  entry_id uuid not null,
  entry_date date not null,
  expected_revision bigint,
  body_hash text not null,
  created_at timestamptz not null default now(),
  primary key(user_id,id)
);
alter table public.journal_entries enable row level security;
alter table public.journal_sources enable row level security;
alter table public.journal_write_operations enable row level security;
revoke all on public.journal_entries,public.journal_sources,public.journal_write_operations from public,anon,authenticated;
grant select on public.journal_entries,public.journal_sources to authenticated;
create policy "Read own journal" on public.journal_entries for select to authenticated using((select auth.uid())=user_id);
create policy "Read own journal sources" on public.journal_sources for select to authenticated using((select auth.uid())=user_id);
-- Write receipts have no client policies or grants: default-deny. No journal text is copied here.

create function public.save_journal_entry(p_operation_id uuid,p_date date,p_expected_revision bigint,p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); receipt public.journal_write_operations; saved public.journal_entries;
begin
  if actor is null then raise exception 'Sign in before writing your journal' using errcode='42501'; end if;
  if p_operation_id is null or p_date is null or p_body is null or length(btrim(p_body,E' \n\r\t'))=0 or length(p_body)>100000
    or (p_expected_revision is not null and p_expected_revision<1)
    then raise exception 'Check the date and entry text (maximum 100000 characters)' using errcode='22023'; end if;
  -- A date-scoped lock serializes creations, saves and appends, including separate devices.
  perform pg_advisory_xact_lock(hashtextextended('journal:'||actor::text||':'||p_date::text,0));
  select * into receipt from public.journal_write_operations where user_id=actor and id=p_operation_id;
  if found then
    if receipt.entry_date<>p_date or receipt.expected_revision is distinct from p_expected_revision
      or receipt.body_hash<>encode(sha256(convert_to(p_body,'UTF8')),'hex')
      then raise exception 'This request ID belongs to a different save' using errcode='22023'; end if;
    select * into saved from public.journal_entries where id=receipt.entry_id and user_id=actor;
    return jsonb_build_object('entry',case when saved.id is null then null else to_jsonb(saved) end,'replayed',true);
  end if;
  if p_expected_revision is null then
    insert into public.journal_entries(user_id,entry_date,body) values(actor,p_date,p_body)
      on conflict(user_id,entry_date) do nothing returning * into saved;
  else
    update public.journal_entries set body=p_body,revision=revision+1,updated_at=clock_timestamp()
      where user_id=actor and entry_date=p_date and revision=p_expected_revision returning * into saved;
  end if;
  if saved.id is null then raise exception 'Your entry changed on another device or received a note. Review the saved version.' using errcode='40001'; end if;
  insert into public.journal_write_operations(user_id,id,entry_id,entry_date,expected_revision,body_hash)
    values(actor,p_operation_id,saved.id,p_date,p_expected_revision,encode(sha256(convert_to(p_body,'UTF8')),'hex'));
  return jsonb_build_object('entry',to_jsonb(saved),'replayed',false);
end $$;

create function public.append_capture_to_journal(p_note_id uuid,p_date date,p_expected_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); capture public.inbox_notes; source public.journal_sources; saved public.journal_entries;
begin
  if actor is null then raise exception 'Sign in before adding to your journal' using errcode='42501'; end if;
  if p_note_id is null or p_date is null then raise exception 'Choose a capture and journal date' using errcode='22023'; end if;
  -- The same capture can be journalled once, even if callers select different dates.
  select * into capture from public.inbox_notes where id=p_note_id and user_id=actor for update;
  select * into source from public.journal_sources where note_id=p_note_id and user_id=actor;
  if found then
    select * into saved from public.journal_entries where id=source.entry_id and user_id=actor;
    return jsonb_build_object('entry',case when saved.id is null then null else to_jsonb(saved) end,'source',to_jsonb(source),'replayed',true);
  end if;
  if capture.id is null then raise exception 'This capture is no longer available' using errcode='P0002'; end if;
  if capture.archived_at is not null then raise exception 'Restore the capture before adding it to your journal' using errcode='22023'; end if;
  if p_expected_body is null or capture.body<>p_expected_body then raise exception 'The capture changed. Reload it before adding.' using errcode='40001'; end if;
  perform pg_advisory_xact_lock(hashtextextended('journal:'||actor::text||':'||p_date::text,0));
  insert into public.journal_entries(user_id,entry_date,body) values(actor,p_date,capture.body)
    on conflict(user_id,entry_date) do nothing returning * into saved;
  if saved.id is null then
    update public.journal_entries set body=body||E'\n\n'||capture.body,revision=revision+1,updated_at=clock_timestamp()
      where user_id=actor and entry_date=p_date returning * into saved;
  end if;
  insert into public.journal_sources(user_id,note_id,entry_id,entry_date) values(actor,capture.id,saved.id,p_date) returning * into source;
  return jsonb_build_object('entry',to_jsonb(saved),'source',to_jsonb(source),'replayed',false);
end $$;
revoke all on function public.save_journal_entry(uuid,date,bigint,text),public.append_capture_to_journal(uuid,date,text) from public,anon,authenticated;
grant execute on function public.save_journal_entry(uuid,date,bigint,text),public.append_capture_to_journal(uuid,date,text) to authenticated;
commit;
