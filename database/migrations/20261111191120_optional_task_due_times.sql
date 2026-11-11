-- REVIEW ONLY. Requires the existing tasks table and migration 001.
-- Apply only with separate owner approval. Never rerun migration 008.
begin;

alter table public.tasks add column due_has_time boolean not null default false;
alter table public.tasks add constraint tasks_timed_due_requires_date
  check (not due_has_time or due_at is not null);

-- Keep the existing conversion RPC and old clients working. The wrapper is an
-- invoker, uses existing ownership policies, and shares the original note lock.
-- Creation, linking and the timed marker are one transaction. Replays never
-- change an existing task's deadline or recreate a removed task.
create function public.convert_inbox_note_timed(
  p_note_id uuid, p_title text, p_description text, p_priority text,
  p_due_at timestamptz, p_project_id uuid
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := auth.uid();
  capture public.inbox_notes%rowtype;
  result jsonb;
  saved_task public.tasks%rowtype;
begin
  if actor is null then
    raise exception 'Sign in before converting a capture' using errcode = '42501';
  end if;
  select * into capture from public.inbox_notes
    where id = p_note_id and user_id = actor for update;
  if not found then
    raise exception 'Capture not found for this account' using errcode = 'P0002';
  end if;
  if capture.converted_at is not null then
    return public.convert_inbox_note(p_note_id,p_title,p_description,p_priority,p_due_at,p_project_id);
  end if;
  if p_due_at is null then
    raise exception 'A timed deadline needs a date and time' using errcode = '22023';
  end if;
  result := public.convert_inbox_note(p_note_id,p_title,p_description,p_priority,p_due_at,p_project_id);
  update public.tasks set due_has_time = true
    where id = (result->'task'->>'id')::uuid and user_id = actor
    returning * into saved_task;
  if not found then
    raise exception 'Task could not be updated' using errcode = 'P0002';
  end if;
  return jsonb_build_object('note',result->'note','task',to_jsonb(saved_task));
end;
$$;
revoke all on function public.convert_inbox_note_timed(uuid,text,text,text,timestamptz,uuid) from public, anon;
grant execute on function public.convert_inbox_note_timed(uuid,text,text,text,timestamptz,uuid) to authenticated;

commit;
