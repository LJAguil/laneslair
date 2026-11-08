-- REVIEW ONLY. Owner must approve and run this in the SQL Editor.
-- Additive: leaves existing notifications, task reminder_at, data and policies alone.
-- Activation/pg_cron/Vault are deliberately a separate, opt-in step.
begin;
create schema if not exists lair_private;
revoke all on schema lair_private from public, anon, authenticated;

create table public.push_devices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check(length(endpoint) between 1 and 2048),
  p256dh text not null check(length(p256dh)=87),
  auth text not null check(length(auth)=22),
  expires_at timestamptz,
  last_test_at timestamptz,
  created_at timestamptz not null default now(),
  unique(id,user_id)
);
create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paused boolean not null default false,
  time_zone text not null default 'UTC',
  quiet_start time,
  quiet_end time,
  check((quiet_start is null and quiet_end is null) or
    (quiet_start is not null and quiet_end is not null and quiet_start<>quiet_end))
);
create table public.reminder_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  habit_id uuid,
  enabled boolean not null default true,
  local_date date,
  local_time time not null check(extract(second from local_time)=0),
  time_zone text not null,
  revision uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  foreign key(habit_id,user_id) references public.habits(id,user_id) on delete cascade,
  check((task_id is not null and habit_id is null and local_date is not null) or
    (habit_id is not null and task_id is null and local_date is null)),
  unique(user_id,task_id), unique(user_id,habit_id), unique(id,user_id)
);
create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  rule_id uuid not null,
  device_id uuid not null,
  revision uuid not null,
  local_day date not null,
  claimed_at timestamptz not null default now(),
  outcome text not null default 'claimed' check(outcome in ('claimed','accepted','failed','expired','skipped')),
  foreign key(rule_id,user_id) references public.reminder_rules(id,user_id) on delete cascade,
  foreign key(device_id,user_id) references public.push_devices(id,user_id) on delete cascade,
  -- One reminder occurrence per device/day, even after edits or repeated scheduler requests.
  unique(rule_id,device_id,local_day)
);
create index reminder_rules_owner on public.reminder_rules(user_id);
create index push_devices_owner on public.push_devices(user_id);
create index push_deliveries_age on public.push_deliveries(claimed_at);
create table lair_private.push_worker_config (
  singleton boolean primary key default true check(singleton),
  secret_hash text not null check(length(secret_hash)=64)
);
-- Defense in depth: no client policies means default-deny, even if grants drift.
-- The owner-created SECURITY DEFINER worker functions retain their required access.
alter table lair_private.push_worker_config enable row level security;
revoke all on all tables in schema lair_private from public,anon,authenticated;

alter table public.push_devices enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.reminder_rules enable row level security;
alter table public.push_deliveries enable row level security;
revoke all on public.push_devices,public.notification_preferences,public.reminder_rules,public.push_deliveries from public,anon,authenticated;
grant select,delete on public.push_devices to authenticated;
grant insert(id,user_id,endpoint,p256dh,auth,expires_at),update(endpoint,p256dh,auth,expires_at) on public.push_devices to authenticated;
grant select,insert,update,delete on public.notification_preferences to authenticated;
grant select,delete on public.reminder_rules to authenticated;
grant insert(user_id,task_id,habit_id,enabled,local_date,local_time,time_zone),
  update(enabled,local_date,local_time,time_zone) on public.reminder_rules to authenticated;
grant select on public.push_deliveries to authenticated;
create policy own on public.push_devices for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy own on public.notification_preferences for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy own on public.reminder_rules for all to authenticated using((select auth.uid())=user_id)
  with check((select auth.uid())=user_id and
    (task_id is null or exists(select 1 from public.tasks t where t.id=task_id and t.user_id=(select auth.uid()))));
create policy own on public.push_deliveries for select to authenticated using((select auth.uid())=user_id);

create function lair_private.validate_reminder_zone() returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.time_zone) then raise exception 'Choose a valid time zone'; end if;
  if tg_table_name='reminder_rules' then
    new.revision:=gen_random_uuid();
    -- Reject nonexistent wall times in a spring-forward gap; never silently shift them.
    if new.local_date is not null and
      (((new.local_date+new.local_time) at time zone new.time_zone) at time zone new.time_zone) <> (new.local_date+new.local_time)
      then raise exception 'This reminder time does not exist because the clocks change. Choose another time.'; end if;
  end if;
  return new;
end $$;
create trigger validate_zone before insert or update on public.notification_preferences
  for each row execute function lair_private.validate_reminder_zone();
create trigger validate_zone before insert or update on public.reminder_rules
  for each row execute function lair_private.validate_reminder_zone();

-- Serializes/rate-limits test sends, returns ONLY an owned matching device.
create function public.claim_push_test(device uuid, device_endpoint text) returns setof public.push_devices
language sql security definer set search_path='' as $$
  update public.push_devices set last_test_at=clock_timestamp()
  where id=device and user_id=(select auth.uid()) and endpoint=device_endpoint
    and (expires_at is null or expires_at>clock_timestamp())
    and (last_test_at is null or last_test_at<clock_timestamp()-interval '30 seconds') returning *;
$$;
revoke all on function public.claim_push_test(uuid,text) from public,anon;
grant execute on function public.claim_push_test(uuid,text) to authenticated;

create function lair_private.check_worker(secret text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if secret is null or length(secret)<64 or not exists(
    select 1 from lair_private.push_worker_config where secret_hash=encode(sha256(convert_to(secret,'UTF8')),'hex')
  ) then raise exception 'Unauthorized' using errcode='42501'; end if;
end $$;
revoke all on function lair_private.check_worker(text) from public,anon,authenticated;

-- Most recent wall-clock occurrence, including just before local midnight.
create function lair_private.reminder_day(rule public.reminder_rules, at_time timestamptz) returns date
language sql stable set search_path='' as $$
 select coalesce(rule.local_date,(at_time at time zone rule.time_zone)::date -
   case when (at_time at time zone rule.time_zone)::time<rule.local_time then 1 else 0 end);
$$;
revoke all on function lair_private.reminder_day(public.reminder_rules,timestamptz) from public,anon,authenticated;

-- Pure SQL eligibility is reused immediately before delivery. No task due_at inference.
create function lair_private.reminder_ready(rule public.reminder_rules, at_time timestamptz) returns boolean
language sql stable set search_path='' as $$
 select rule.enabled and exists(
   select 1 from public.notification_preferences p
   cross join lateral (select lair_private.reminder_day(rule,at_time) as day) d
   cross join lateral (select (d.day+rule.local_time) at time zone rule.time_zone as due) s
   where p.user_id=rule.user_id and not p.paused
   and s.due<=at_time and s.due>at_time-interval '10 minutes'
   and (s.due at time zone rule.time_zone)::time=rule.local_time
   and (p.quiet_start is null or not (
     case when p.quiet_start<p.quiet_end then
       (s.due at time zone p.time_zone)::time>=p.quiet_start and (s.due at time zone p.time_zone)::time<p.quiet_end
     else (s.due at time zone p.time_zone)::time>=p.quiet_start or (s.due at time zone p.time_zone)::time<p.quiet_end end
   ))
   and (p.quiet_start is null or not (
     case when p.quiet_start<p.quiet_end then
       (at_time at time zone p.time_zone)::time>=p.quiet_start and (at_time at time zone p.time_zone)::time<p.quiet_end
     else (at_time at time zone p.time_zone)::time>=p.quiet_start or (at_time at time zone p.time_zone)::time<p.quiet_end end
   ))
   and (rule.task_id is null or exists(select 1 from public.tasks t where t.id=rule.task_id
     and t.user_id=rule.user_id and t.status::text in ('todo','in_progress')
     and (t.project_id is null or not exists(select 1 from public.projects pr where pr.id=t.project_id and pr.status::text='archived'))))
   and (rule.habit_id is null or exists(select 1 from public.habits h where h.id=rule.habit_id and h.user_id=rule.user_id and h.is_active
     and not exists(select 1 from public.habit_logs l where l.habit_id=h.id and l.user_id=h.user_id and l.completed_on=d.day and l.amount>=l.target)
     and (h.frequency='daily' or (select count(*) from public.habit_logs l where l.habit_id=h.id and l.user_id=h.user_id
       and l.completed_on between date_trunc('week',d.day)::date and date_trunc('week',d.day)::date+6 and l.amount>=l.target)<h.target_per_week)))
 );
$$;
revoke all on function lair_private.reminder_ready(public.reminder_rules,timestamptz) from public,anon,authenticated;

create function public.claim_push_reminders(worker_secret text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform lair_private.check_worker(worker_secret);
 -- Receipts deliberately survive failed/ambiguous sends: no automatic resend/duplicate.
 with candidates as (
   select r.id as rule_id,r.user_id,r.revision,r.habit_id,d.id as device_id,
     lair_private.reminder_day(r,statement_timestamp()) as local_day
   from public.reminder_rules r join public.push_devices d on d.user_id=r.user_id
   where (d.expires_at is null or d.expires_at>statement_timestamp())
     and lair_private.reminder_ready(r,statement_timestamp())
     and not exists(select 1 from public.push_deliveries x where x.rule_id=r.id and x.device_id=d.id and x.local_day=lair_private.reminder_day(r,statement_timestamp()))
   order by r.id,d.id limit 100
 ), claimed as (
   insert into public.push_deliveries(user_id,rule_id,device_id,revision,local_day)
   select user_id,rule_id,device_id,revision,local_day from candidates
   on conflict(rule_id,device_id,local_day) do nothing returning *
 )
 select coalesce(jsonb_agg(jsonb_build_object('delivery_id',c.id,'id',d.id,'endpoint',d.endpoint,'p256dh',d.p256dh,'auth',d.auth,'expires_at',d.expires_at,
   'kind',case when r.habit_id is null then 'task' else 'habit' end)),'[]'::jsonb) into result
 from claimed c join public.push_devices d on d.id=c.device_id join public.reminder_rules r on r.id=c.rule_id;
 return result;
end $$;

-- Claim the right to make ONE network attempt, then recheck live completion/pause/archive state.
create function public.begin_push_delivery(worker_secret text, delivery uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare allowed boolean; receipt public.push_deliveries;
begin
 perform lair_private.check_worker(worker_secret);
 select * into receipt from public.push_deliveries where id=delivery for update;
 if not found or receipt.outcome<>'claimed' or receipt.claimed_at<clock_timestamp()-interval '2 minutes' then return false; end if;
 select lair_private.reminder_ready(r,clock_timestamp()) and r.revision=receipt.revision into allowed
 from public.reminder_rules r where r.id=receipt.rule_id;
 update public.push_deliveries set outcome=case when coalesce(allowed,false) then 'failed' else 'skipped' end where id=delivery;
 return coalesce(allowed,false);
end $$;

create function public.finish_push_delivery(worker_secret text, delivery uuid, result text) returns void
language plpgsql security definer set search_path='' as $$
declare device uuid;
begin
 perform lair_private.check_worker(worker_secret);
 if result not in ('accepted','failed','expired') then raise exception 'Invalid result'; end if;
 update public.push_deliveries set outcome=result where id=delivery and outcome='failed' returning device_id into device;
 if result='expired' and device is not null then delete from public.push_devices where id=device; end if;
end $$;
revoke all on function public.claim_push_reminders(text),public.begin_push_delivery(text,uuid),public.finish_push_delivery(text,uuid,text) from public,anon,authenticated;
-- Publishable key transports these calls, but a separate 256-bit worker secret authorizes them.
-- The capability cannot read tasks/profiles or run arbitrary SQL.
grant execute on function public.claim_push_reminders(text),public.begin_push_delivery(text,uuid),public.finish_push_delivery(text,uuid,text) to anon;
commit;
