-- REVIEW BEFORE RUNNING. Adds quantity tracking to the inspected habits schema.
-- Preserves existing rows and ownership policies. Apply once as database owner.
begin;

alter table public.habits
  add column tracking_type text not null default 'check' check (tracking_type in ('check','quantity')),
  add column daily_target numeric(12,3) not null default 1 check (daily_target > 0 and daily_target <= 1000000),
  add column unit text not null default 'check-in' check (length(btrim(unit)) between 1 and 30),
  add column streak_enabled boolean not null default true,
  add column color text not null default 'violet' check (color in ('violet','blue','emerald','amber','rose','cyan')),
  add column updated_at timestamptz not null default now(),
  add constraint habits_check_target check (tracking_type <> 'check' or daily_target = 1);

alter table public.habit_logs
  add column amount numeric(15,3) not null default 1 check (amount >= 0 and amount <= 1000000000),
  add column target numeric(12,3) not null default 1 check (target > 0 and target <= 1000000),
  add column updated_at timestamptz not null default now();
-- Existing check-ins retain amount=1,target=1, so their completion is unchanged.
-- Each day's saved target is fixed at its first log; goal edits affect new days.

create function public.guard_habit_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.tracking_type, new.unit, new.frequency, new.target_per_week)
     is distinct from (old.tracking_type, old.unit, old.frequency, old.target_per_week)
     and exists (select 1 from public.habit_logs where habit_id = old.id and user_id = old.user_id) then
    raise exception 'Tracking type, units, and schedule cannot change after logging. Archive this habit and create another.' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger preserve_habit_history before update on public.habits
  for each row execute function public.guard_habit_history();
revoke all on function public.guard_habit_history() from public, anon;

create table public.habit_log_operations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null,
  completed_on date not null,
  mode text not null check (mode in ('add','set')),
  value numeric(15,3) not null,
  created_at timestamptz not null default now(),
  foreign key (habit_id,user_id) references public.habits(id,user_id) on delete cascade
);
alter table public.habit_log_operations enable row level security;
create policy "Read own habit operations" on public.habit_log_operations for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.habit_log_operations from public, anon, authenticated;
grant select on public.habit_log_operations to authenticated;

create function public.record_habit_progress(
  p_operation_id uuid, p_habit_id uuid, p_date date, p_mode text, p_value numeric
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  habit public.habits%rowtype;
  day public.habit_logs%rowtype;
  receipt public.habit_log_operations%rowtype;
  new_amount numeric;
  day_target numeric;
begin
  if actor is null then raise exception 'Sign in to track habits' using errcode = '42501'; end if;
  select * into habit from public.habits where id = p_habit_id and user_id = actor for update;
  if not found then raise exception 'Habit unavailable for this account' using errcode = 'P0002'; end if;

  select * into receipt from public.habit_log_operations where id = p_operation_id;
  if found then
    if (receipt.user_id,receipt.habit_id,receipt.completed_on,receipt.mode,receipt.value)
       is distinct from (actor,p_habit_id,p_date,p_mode,p_value) then
      raise exception 'This request ID was already used for a different update' using errcode = '22023';
    end if;
    select * into day from public.habit_logs where habit_id = habit.id and user_id = actor and completed_on = p_date;
    return jsonb_build_object('log',to_jsonb(day));
  end if;

  if not habit.is_active then raise exception 'Restore this habit before logging' using errcode = '22023'; end if;
  if p_operation_id is null or p_date is null or p_date > current_date + 1
     or p_date < (habit.created_at at time zone 'UTC')::date - 1 then
    raise exception 'Choose a valid tracking date' using errcode = '22023';
  end if;
  if p_mode is null or p_mode not in ('add','set') or p_value is null
     or not (p_value between -1000000 and 1000000) or p_value <> round(p_value,3)
     or (p_mode = 'set' and p_value < 0) then
    raise exception 'Choose a valid tracking amount' using errcode = '22023';
  end if;
  if habit.tracking_type = 'check' and (p_mode <> 'set' or p_value not in (0,1)) then
    raise exception 'Check-in habits accept only complete or undo' using errcode = '22023';
  end if;

  select * into day from public.habit_logs where habit_id = habit.id and user_id = actor and completed_on = p_date for update;
  day_target := coalesce(day.target, habit.daily_target);
  new_amount := greatest(0, case when p_mode = 'set' then p_value else coalesce(day.amount,0) + p_value end);
  if new_amount > 1000000000 then raise exception 'Daily total is too large' using errcode = '22023'; end if;

  insert into public.habit_logs(user_id,habit_id,completed_on,note,amount,target)
    values(actor,habit.id,p_date,'',new_amount,day_target)
    on conflict (habit_id,completed_on) do update set amount = excluded.amount, updated_at = now()
    returning * into day;
  insert into public.habit_log_operations(id,user_id,habit_id,completed_on,mode,value)
    values(p_operation_id,actor,habit.id,p_date,p_mode,p_value);
  return jsonb_build_object('log',to_jsonb(day));
end;
$$;
revoke all on function public.record_habit_progress(uuid,uuid,date,text,numeric) from public, anon;
grant execute on function public.record_habit_progress(uuid,uuid,date,text,numeric) to authenticated;
commit;
