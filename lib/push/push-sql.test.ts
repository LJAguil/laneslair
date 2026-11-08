import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const USER="11111111-1111-4111-8111-111111111111", OTHER="22222222-2222-4222-8222-222222222222";
// Fixed non-production test capability; never used outside this in-memory database.
const SECRET="a".repeat(64);
let db:PGlite;
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated;
    create table public.projects(id uuid primary key,user_id uuid,status text default 'active');
    create table public.tasks(id uuid primary key,user_id uuid not null,status text default 'todo',project_id uuid,due_at timestamptz);
    create table public.habits(id uuid primary key,user_id uuid not null,is_active boolean default true,frequency text default 'daily',target_per_week integer default 7,unique(id,user_id));
    create table public.habit_logs(habit_id uuid,user_id uuid,completed_on date,amount numeric,target numeric);
    create table public.notifications(id uuid primary key, user_id uuid, title text, body text not null default '',scheduled_at timestamptz not null,sent_at timestamptz,read_at timestamptz,status text default 'pending',created_at timestamptz default now());
    alter table public.tasks enable row level security; alter table public.habits enable row level security;
    create policy own on public.tasks for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
    create policy own on public.habits for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
    grant select,insert,update,delete on public.tasks,public.habits to authenticated;
    insert into auth.users values('${USER}'),('${OTHER}');
    insert into public.notifications(id,user_id,title,scheduled_at) values('${USER}','${USER}','Keep me',now());
  `);
  await db.exec(readFileSync(new URL('../../database/migrations/20261107_003_push_reminders.sql',import.meta.url),'utf8'));
  await db.query("insert into lair_private.push_worker_config(secret_hash) values(encode(sha256(convert_to($1,'UTF8')),'hex'))",[SECRET]);
},30000);
beforeEach(async()=>{
  await db.exec("reset role; truncate public.push_deliveries,public.reminder_rules,public.push_devices,public.notification_preferences,public.tasks,public.habits,public.habit_logs,public.projects cascade;");
  await asUser(USER);
  await db.query("insert into public.notification_preferences(user_id,time_zone) values($1,'UTC')",[USER]);
});
afterAll(async()=>{await db?.close();});
async function asUser(id:string){await db.exec('reset role; set role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
async function device(owner=USER){const id=randomUUID();await db.query("insert into public.push_devices(id,user_id,endpoint,p256dh,auth) values($1,$2,$3,$4,$5)",[id,owner,`https://web.push.apple.com/${id}`,'B'.repeat(87),'A'.repeat(22)]);return id;}
async function task(){const id=randomUUID();await db.query('insert into public.tasks(id,user_id,due_at) values($1,$2,now())',[id,USER]);return id;}
async function habit(frequency='daily',target=7){const id=randomUUID();await db.query('insert into public.habits(id,user_id,frequency,target_per_week) values($1,$2,$3,$4)',[id,USER,frequency,target]);return id;}
async function rule(id:string,kind='task'){
  return (await db.query<{id:string}>(`insert into public.reminder_rules(user_id,task_id,habit_id,local_date,local_time,time_zone)
    values($1,$2,$3,${kind==='task'?'current_date':'null'},date_trunc('minute',clock_timestamp() at time zone 'UTC')::time,'UTC') returning id`,[USER,kind==='task'?id:null,kind==='habit'?id:null])).rows[0].id;
}
async function claim(secret=SECRET){await db.exec("reset role; set role anon;");return (await db.query<{jobs:{delivery_id:string;id:string;kind:string}[]}>("select public.claim_push_reminders($1) as jobs",[secret])).rows[0].jobs;}
async function begin(id:string){return(await db.query<{ok:boolean}>('select public.begin_push_delivery($1,$2) as ok',[SECRET,id])).rows[0].ok;}
async function ready(id:string,at:string){await db.exec('reset role;');return(await db.query<{ok:boolean}>('select lair_private.reminder_ready(r,$2::timestamptz) as ok from public.reminder_rules r where id=$1',[id,at])).rows[0].ok;}

describe('push ownership, reminders and delivery receipts (local PostgreSQL)',()=>{
  it('enables default-deny RLS on worker configuration as well as revoking client privileges',async()=>{
    await db.exec('reset role;');
    const result=await db.query<{enabled:boolean;policies:number}>(`select c.relrowsecurity as enabled,
      (select count(*)::integer from pg_policy p where p.polrelid=c.oid) as policies
      from pg_class c where c.oid='lair_private.push_worker_config'::regclass`);
    expect(result.rows[0]).toEqual({enabled:true,policies:0});
    // Temporarily simulate an accidental future SELECT grant; RLS still hides the hash.
    await db.exec('grant usage on schema lair_private to anon,authenticated; grant select on lair_private.push_worker_config to anon,authenticated;');
    try {
      await asUser(USER);expect((await db.query('select * from lair_private.push_worker_config')).rows).toHaveLength(0);
      await db.exec('reset role;set role anon;');expect((await db.query('select * from lair_private.push_worker_config')).rows).toHaveLength(0);
    } finally {
      await db.exec('reset role; revoke usage on schema lair_private from anon,authenticated; revoke select on lair_private.push_worker_config from anon,authenticated;');
    }
  });
  it('preserves existing notifications',async()=>{await db.exec('reset role;');expect((await db.query<{title:string}>('select title from public.notifications')).rows[0].title).toBe('Keep me');});
  it('isolates subscriptions, rules and tests by verified ownership',async()=>{
    const d=await device(),t=await task();await rule(t);
    await asUser(OTHER);
    expect((await db.query('select * from public.push_devices')).rows).toHaveLength(0);
    expect((await db.query('select * from public.reminder_rules')).rows).toHaveLength(0);
    expect((await db.query('select * from public.claim_push_test($1,$2)',[d,`https://web.push.apple.com/${d}`])).rows).toHaveLength(0);
    await expect(db.query("insert into public.reminder_rules(user_id,task_id,local_date,local_time,time_zone) values($1,$2,current_date,'12:00','UTC')",[OTHER,t])).rejects.toThrow(/row-level/);
    await expect(db.query("insert into public.push_devices(id,user_id,endpoint,p256dh,auth) values($1,$2,'https://web.push.apple.com/foreign',$3,$4)",[randomUUID(),USER,'B'.repeat(87),'A'.repeat(22)])).rejects.toThrow(/row-level/);
  });
  it('restricts test sends to matching device and throttles repeated tests',async()=>{
    const d=await device();
    expect((await db.query('select * from public.claim_push_test($1,$2)',[d,'https://web.push.apple.com/wrong'])).rows).toHaveLength(0);
    expect((await db.query('select * from public.claim_push_test($1,$2)',[d,`https://web.push.apple.com/${d}`])).rows).toHaveLength(1);
    expect((await db.query('select * from public.claim_push_test($1,$2)',[d,`https://web.push.apple.com/${d}`])).rows).toHaveLength(0);
    await expect(db.query('update public.push_devices set last_test_at=null where id=$1',[d])).rejects.toThrow(/permission/);
  });
  it('supports multiple devices and independent removal',async()=>{
    const d1=await device(),d2=await device();const t=await task();await rule(t);
    await db.query('delete from public.push_devices where id=$1',[d1]);
    const jobs=await claim();expect(jobs.map(x=>x.id)).toEqual([d2]);
  });
  it('requires a separate worker capability and keeps receipts private',async()=>{
    await expect(claim('wrong')).rejects.toThrow(/Unauthorized/);
    await expect(db.query('select * from public.push_devices')).rejects.toThrow(/permission/);
    await expect(db.query('select * from lair_private.push_worker_config')).rejects.toThrow(/permission/);
    await asUser(USER);await expect(db.query("insert into public.push_deliveries(user_id,rule_id,device_id,revision,local_day) values($1,$1,$1,$1,current_date)",[USER])).rejects.toThrow(/permission/);
  });
  it('deduplicates scheduler calls and network attempts even after same-day edits',async()=>{
    await device();const t=await task(),r=await rule(t);
    const jobs=await claim();expect(jobs).toHaveLength(1);expect(await claim()).toHaveLength(0);
    expect(await begin(jobs[0].delivery_id)).toBe(true);expect(await begin(jobs[0].delivery_id)).toBe(false);
    await db.query('select public.finish_push_delivery($1,$2,$3)',[SECRET,jobs[0].delivery_id,'accepted']);
    await asUser(USER);await db.query('update public.reminder_rules set enabled=true where id=$1',[r]);expect(await claim()).toHaveLength(0);
  });
  it('does not infer reminders from task due_at and skips completed/cancelled tasks',async()=>{
    await device();const t=await task();expect(await claim()).toHaveLength(0);
    await asUser(USER);await rule(t);await db.query("update public.tasks set status='done' where id=$1",[t]);expect(await claim()).toHaveLength(0);
    await asUser(USER);await db.query("update public.tasks set status='cancelled' where id=$1",[t]);expect(await claim()).toHaveLength(0);
    await asUser(USER);await db.query("update public.tasks set status='todo' where id=$1",[t]);expect(await claim()).toHaveLength(1);
  });
  it('rechecks completion, pause and rule changes immediately before sending',async()=>{
    await device();const t=await task();await rule(t);const jobs=await claim();
    await asUser(USER);await db.query("update public.tasks set status='done' where id=$1",[t]);await db.exec('reset role;set role anon;');expect(await begin(jobs[0].delivery_id)).toBe(false);
  });
  it('skips quantity-complete habits using the log target snapshot, and archived habits',async()=>{
    await device();const h=await habit();await rule(h,'habit');
    await db.exec('reset role;');await db.query('insert into public.habit_logs values($1,$2,current_date,8,8)',[h,USER]);expect(await claim()).toHaveLength(0);
    await db.exec('reset role;');await db.query('update public.habit_logs set amount=7 where habit_id=$1',[h]);
    await asUser(USER);await db.query('update public.habits set is_active=false where id=$1',[h]);expect(await claim()).toHaveLength(0);
    await asUser(USER);await db.query('update public.habits set is_active=true where id=$1',[h]);expect(await claim()).toHaveLength(1);
  });
  it('skips weekly habits after the target number of successful days',async()=>{
    await device();const h=await habit('weekly',1);await rule(h,'habit');await db.exec('reset role;');
    await db.query("insert into public.habit_logs values($1,$2,date_trunc('week',current_date)::date,1,1)",[h,USER]);expect(await claim()).toHaveLength(0);
  });
  it('pause, expired subscriptions and deleted items produce no deliveries',async()=>{
    const d=await device(),t=await task();await rule(t);
    await db.query('update public.notification_preferences set paused=true where user_id=$1',[USER]);expect(await claim()).toHaveLength(0);
    await asUser(USER);await db.query('update public.notification_preferences set paused=false where user_id=$1',[USER]);
    await db.query("update public.push_devices set expires_at=now()-interval '1 hour' where id=$1",[d]);expect(await claim()).toHaveLength(0);
    await asUser(USER);await db.query('delete from public.tasks where id=$1',[t]);expect((await db.query('select * from public.reminder_rules')).rows).toHaveLength(0);
  });
  it('uses explicit wall time and zone across DST, limits late catch-up and quiet hours',async()=>{
    const t=await task(),r=await rule(t);
    await db.query("update public.reminder_rules set local_date='2026-11-07',local_time='09:00',time_zone='America/Chicago' where id=$1",[r]);
    expect(await ready(r,'2026-11-07T14:59:00Z')).toBe(false);
    expect(await ready(r,'2026-11-07T15:01:00Z')).toBe(true);
    expect(await ready(r,'2026-11-07T15:11:00Z')).toBe(false);
    await asUser(USER);await db.query("update public.notification_preferences set quiet_start='22:00',quiet_end='10:00',time_zone='America/Chicago' where user_id=$1",[USER]);
    expect(await ready(r,'2026-11-07T15:01:00Z')).toBe(false);
    await asUser(USER);await db.query("update public.notification_preferences set quiet_start=null,quiet_end=null where user_id=$1",[USER]);
    await expect(db.query("update public.reminder_rules set local_date='2027-03-14',local_time='02:30' where id=$1",[r])).rejects.toThrow(/does not exist/);
    await db.query("update public.reminder_rules set local_date='2027-03-14',local_time='09:00' where id=$1",[r]);
    expect(await ready(r,'2027-03-14T14:01:00Z')).toBe(true);
  });
  it('catches a just-before-midnight habit occurrence and skips spring-forward gaps',async()=>{
    const h=await habit(),r=await rule(h,'habit');
    await db.query("update public.reminder_rules set local_time='23:59',time_zone='America/Chicago' where id=$1",[r]);
    expect(await ready(r,'2026-11-08T06:01:00Z')).toBe(true); // 00:01 after yesterday's slot.
    await asUser(USER);await db.query("update public.reminder_rules set local_time='02:30' where id=$1",[r]);
    expect(await ready(r,'2027-03-14T08:31:00Z')).toBe(false); // Nonexistent 02:30, not 03:30.
    await asUser(USER);await db.query("update public.reminder_rules set local_time='01:30' where id=$1",[r]);
    expect(await ready(r,'2026-11-01T06:31:00Z')).toBe(false); // First 01:30, before standard-time slot.
    expect(await ready(r,'2026-11-01T07:31:00Z')).toBe(true);
  });
  it('rechecks pause and changed rules, and excludes archived projects',async()=>{
    await device();const t=await task(),r=await rule(t);let jobs=await claim();
    await asUser(USER);await db.query('update public.notification_preferences set paused=true where user_id=$1',[USER]);
    await db.exec('reset role;set role anon;');expect(await begin(jobs[0].delivery_id)).toBe(false);
    await db.exec('reset role;');await db.query('delete from public.push_deliveries');
    await asUser(USER);await db.query('update public.notification_preferences set paused=false where user_id=$1',[USER]);jobs=await claim();
    await asUser(USER);await db.query('update public.reminder_rules set enabled=false where id=$1',[r]);await db.exec('reset role;set role anon;');expect(await begin(jobs[0].delivery_id)).toBe(false);
    await db.exec('reset role;');await db.query('delete from public.push_deliveries');
    const p=randomUUID();await db.query("insert into public.projects(id,user_id,status) values($1,$2,'archived')",[p,USER]);await db.query('update public.tasks set project_id=$1 where id=$2',[p,t]);
    await asUser(USER);await db.query('update public.reminder_rules set enabled=true where id=$1',[r]);expect(await claim()).toHaveLength(0);
  });
});
