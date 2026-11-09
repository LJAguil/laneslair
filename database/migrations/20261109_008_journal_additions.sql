-- REVIEW ONLY. Requires migration 004. No remote execution; no backfill of guessed times.
-- Days convert lazily when a new addition/Inbox note is saved. Original body stays intact.
begin;
alter table public.journal_entries add column uses_additions boolean not null default false;
alter table public.journal_entries add constraint journal_entries_id_owner_unique unique(id,user_id);
create table public.journal_additions (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id uuid not null,
 entry_date date not null,
 body text not null check(length(btrim(body,E' \n\r\t'))>0 and length(body)<=100000),
 revision bigint not null default 1 check(revision>=1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 is_legacy boolean not null default false,
 source_note_id uuid,
 foreign key(entry_id,user_id) references public.journal_entries(id,user_id) on delete cascade,
 unique(user_id,source_note_id)
);
create index journal_additions_owner_date on public.journal_additions(user_id,entry_date,created_at,id);
create table public.journal_addition_writes (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 addition_id uuid not null,
 entry_date date not null,
 expected_revision bigint,
 body_hash text not null,
 primary key(user_id,operation_id)
);
alter table public.journal_additions enable row level security;
alter table public.journal_addition_writes enable row level security;
revoke all on public.journal_additions,public.journal_addition_writes from public,anon,authenticated;
grant select on public.journal_additions to authenticated;
create policy "Read own journal additions" on public.journal_additions for select to authenticated using((select auth.uid())=user_id);
-- Write receipts are private, default-deny, with no client grants.
create function public.save_journal_addition(p_operation_id uuid,p_date date,p_addition_id uuid,p_expected_revision bigint,p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();saved public.journal_entries;addition public.journal_additions;receipt public.journal_addition_writes;combined text;
begin
 if actor is null then raise exception 'Sign in first' using errcode='42501';end if;
 if p_operation_id is null or p_addition_id is null or p_date is null or p_body is null or length(btrim(p_body,E' \n\r\t'))=0 or length(p_body)>100000 or (p_expected_revision is not null and p_expected_revision<1) then raise exception 'Check the date and writing' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('journal:'||actor::text||':'||p_date::text,0));
 select * into receipt from public.journal_addition_writes where user_id=actor and operation_id=p_operation_id;
 if found then
  if receipt.addition_id<>p_addition_id or receipt.entry_date<>p_date or receipt.expected_revision is distinct from p_expected_revision or receipt.body_hash<>encode(sha256(convert_to(p_body,'UTF8')),'hex') then raise exception 'Operation ID reused for different writing' using errcode='22023';end if;
  select * into addition from public.journal_additions where id=receipt.addition_id and user_id=actor;
  select * into saved from public.journal_entries where user_id=actor and entry_date=p_date;
  return jsonb_build_object('addition',case when addition.id is null then null else to_jsonb(addition) end,'entry',case when saved.id is null then null else to_jsonb(saved) end,'replayed',true);
 end if;
 select * into saved from public.journal_entries where user_id=actor and entry_date=p_date;
 if saved.id is null then
  if p_expected_revision is not null then raise exception 'Addition changed or disappeared' using errcode='40001';end if;
  insert into public.journal_entries(user_id,entry_date,body,uses_additions) values(actor,p_date,p_body,true) returning * into saved;
 elsif not saved.uses_additions then
  -- The earlier page may contain many sessions: preserve it as ONE labelled legacy block.
  -- created_at is only the known first-save time, never a fabricated time for each paragraph.
  insert into public.journal_additions(id,user_id,entry_id,entry_date,body,created_at,updated_at,is_legacy)
   values(gen_random_uuid(),actor,saved.id,p_date,saved.body,saved.created_at,saved.updated_at,true);
 end if;
 if p_expected_revision is null then
  insert into public.journal_additions(id,user_id,entry_id,entry_date,body) values(p_addition_id,actor,saved.id,p_date,p_body) on conflict(id) do nothing returning * into addition;
 else
  update public.journal_additions set body=p_body,revision=revision+1,updated_at=clock_timestamp()
   where id=p_addition_id and user_id=actor and entry_id=saved.id and entry_date=p_date and revision=p_expected_revision returning * into addition;
 end if;
 if addition.id is null then raise exception 'This addition changed on another device. Your draft is kept.' using errcode='40001';end if;
 select string_agg(body,E'\n\n' order by created_at,id) into combined from public.journal_additions where user_id=actor and entry_id=saved.id;
 update public.journal_entries set body=combined,uses_additions=true,revision=revision+1,updated_at=clock_timestamp() where id=saved.id and user_id=actor returning * into saved;
 insert into public.journal_addition_writes(user_id,operation_id,addition_id,entry_date,expected_revision,body_hash)
  values(actor,p_operation_id,p_addition_id,p_date,p_expected_revision,encode(sha256(convert_to(p_body,'UTF8')),'hex'));
 return jsonb_build_object('addition',to_jsonb(addition),'entry',to_jsonb(saved),'replayed',false);
end $$;
-- Preserve legacy saves for untouched days. Block whole-page overwrite after conversion.
alter function public.save_journal_entry(uuid,date,bigint,text) rename to save_journal_entry_legacy;
revoke all on function public.save_journal_entry_legacy(uuid,date,bigint,text) from public,anon,authenticated;
create function public.save_journal_entry(p_operation_id uuid,p_date date,p_expected_revision bigint,p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('journal:'||auth.uid()::text||':'||p_date::text,0));
 if exists(select 1 from public.journal_entries where user_id=auth.uid() and entry_date=p_date and uses_additions) then raise exception 'This day now uses timestamped additions. Copy any unsaved daily-page draft into a new addition.' using errcode='40001';end if;
 return public.save_journal_entry_legacy(p_operation_id,p_date,p_expected_revision,p_body);
end $$;
create or replace function public.append_capture_to_journal(p_note_id uuid,p_date date,p_expected_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();capture public.inbox_notes;source public.journal_sources;saved public.journal_entries;addition_id uuid:=gen_random_uuid();result jsonb;
begin
 if actor is null then raise exception 'Sign in first' using errcode='42501';end if;
 if p_note_id is null or p_date is null then raise exception 'Choose a capture and date' using errcode='22023';end if;
 select * into capture from public.inbox_notes where id=p_note_id and user_id=actor for update;
 select * into source from public.journal_sources where note_id=p_note_id and user_id=actor;
 if found then
  select * into saved from public.journal_entries where id=source.entry_id and user_id=actor;
  return jsonb_build_object('entry',case when saved.id is null then null else to_jsonb(saved) end,'source',to_jsonb(source),'replayed',true);
 end if;
 if capture.id is null then raise exception 'Capture is unavailable' using errcode='P0002';end if;
 if capture.archived_at is not null then raise exception 'Restore this capture first' using errcode='22023';end if;
 if p_expected_body is null or capture.body<>p_expected_body then raise exception 'Capture changed after preview' using errcode='40001';end if;
 result:=public.save_journal_addition(gen_random_uuid(),p_date,addition_id,null,capture.body);
 update public.journal_additions set source_note_id=capture.id where id=addition_id and user_id=actor;
 select * into saved from public.journal_entries where user_id=actor and entry_date=p_date;
 insert into public.journal_sources(user_id,note_id,entry_id,entry_date) values(actor,capture.id,saved.id,p_date) returning * into source;
 return jsonb_build_object('entry',to_jsonb(saved),'source',to_jsonb(source),'replayed',false);
end $$;
revoke all on function public.save_journal_addition(uuid,date,uuid,bigint,text),public.save_journal_entry(uuid,date,bigint,text),public.append_capture_to_journal(uuid,date,text) from public,anon,authenticated;
grant execute on function public.save_journal_addition(uuid,date,uuid,bigint,text),public.save_journal_entry(uuid,date,bigint,text),public.append_capture_to_journal(uuid,date,text) to authenticated;
commit;
