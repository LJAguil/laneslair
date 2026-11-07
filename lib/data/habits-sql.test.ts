import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { afterAll,beforeAll,beforeEach,describe,expect,it } from "vitest";

const USER="11111111-1111-4111-8111-111111111111",OTHER="22222222-2222-4222-8222-222222222222";
let db:PGlite; let today:string; let legacy:{amount:string;target:string;note:string};
beforeAll(async () => {
  db=new PGlite();
  await db.exec(`
    create role authenticated; create role anon; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated;
    create table public.habits(
      id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
      name text not null,description text not null default '',frequency text not null default 'daily' check(frequency in ('daily','weekly','custom')),
      target_per_week integer not null default 7 check(target_per_week between 1 and 7),is_active boolean not null default true,
      created_at timestamptz not null default now(),unique(id,user_id)
    );
    create table public.habit_logs(
      id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
      habit_id uuid not null,completed_on date not null default current_date,note text not null default '',created_at timestamptz not null default now(),
      unique(habit_id,completed_on),foreign key(habit_id,user_id) references public.habits(id,user_id) on delete cascade
    );
    alter table public.habits enable row level security; alter table public.habit_logs enable row level security;
    create policy own on public.habits for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
    create policy own on public.habit_logs for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
    grant select,insert,update,delete on public.habits,public.habit_logs to authenticated;
    insert into auth.users values('${USER}'),('${OTHER}');
    insert into public.habits(id,user_id,name) values('${USER}','${USER}','Existing habit');
    insert into public.habit_logs(user_id,habit_id,note) values('${USER}','${USER}','Keep this note');
  `);
  await db.exec(readFileSync(new URL("../../database/migrations/20261107_002_habit_tracking.sql",import.meta.url),"utf8"));
  legacy=(await db.query<typeof legacy>("select amount,target,note from public.habit_logs")).rows[0];
  today=(await db.query<{day:string}>("select current_date::text as day")).rows[0].day;
},30000);
beforeEach(async () => { await db.exec("reset role; truncate public.habit_logs,public.habit_log_operations,public.habits;"); await asUser(USER); });
afterAll(async () => { await db?.close(); });
async function asUser(id:string) { await db.exec("reset role; set role authenticated;"); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); }
async function create(quantity=true) { return (await db.query<{id:string}>("insert into public.habits(user_id,name,tracking_type,daily_target,unit,created_at) values($1,'Water',$2,$3,$4,now()-interval '30 days') returning id",[USER,quantity?"quantity":"check",quantity?8:1,quantity?"glasses":"check-in"])).rows[0].id; }
async function record(habitId:string,value:number,operation=randomUUID(),mode="add",date=today) {
  return (await db.query<{result:{log:{amount:number;target:number;completed_on:string}}}>("select public.record_habit_progress($1,$2,$3,$4,$5) as result",[operation,habitId,date,mode,value])).rows[0].result.log;
}

describe("persistent habits SQL", () => {
  it("preserves legacy successful check-ins and notes", () => { expect(Number(legacy.amount)).toBe(1); expect(Number(legacy.target)).toBe(1); expect(legacy.note).toBe("Keep this note"); });
  it("accumulates amounts atomically and replays a request without counting it twice",async () => {
    const id=await create(),op=randomUUID();
    expect((await record(id,2,op)).amount).toBe(2);
    expect((await record(id,2,op)).amount).toBe(2);
    expect((await record(id,3)).amount).toBe(5);
    expect((await record(id,2,op)).amount).toBe(5);
    expect((await db.query("select * from public.habit_logs")).rows).toHaveLength(1);
  });
  it("rejects reuse of the same ID for a different amount",async () => {
    const id=await create(),op=randomUUID(); await record(id,2,op);
    await expect(record(id,3,op)).rejects.toThrow(/different update/);
    expect(Number((await db.query<{amount:string}>("select amount from public.habit_logs")).rows[0].amount)).toBe(2);
  });
  it("supports subtraction, check-in, and undo without negative totals",async () => {
    const water=await create(); await record(water,2); expect((await record(water,-5)).amount).toBe(0);
    const check=await create(false); expect((await record(check,1,randomUUID(),"set")).amount).toBe(1);
    expect((await record(check,0,randomUUID(),"set")).amount).toBe(0);
    await expect(record(check,2)).rejects.toThrow(/complete or undo/);
  });
  it("keeps existing daily goals fixed when a habit's target changes",async () => {
    const id=await create(); expect((await record(id,2)).target).toBe(8);
    await db.query("update public.habits set daily_target=10,streak_enabled=false where id=$1",[id]);
    expect((await record(id,1)).target).toBe(8);
    const tomorrow=(await db.query<{day:string}>("select (current_date+1)::text as day")).rows[0].day;
    expect((await record(id,1,randomUUID(),"add",tomorrow)).target).toBe(10);
    expect((await db.query<{streak_enabled:boolean}>("select streak_enabled from public.habits where id=$1",[id])).rows[0].streak_enabled).toBe(false);
  });
  it("protects logged units and schedule while allowing descriptive edits",async () => {
    const id=await create(); await record(id,1);
    await expect(db.query("update public.habits set unit='mL' where id=$1",[id])).rejects.toThrow(/cannot change/);
    await expect(db.query("update public.habits set frequency='weekly' where id=$1",[id])).rejects.toThrow(/cannot change/);
    await db.query("update public.habits set name='Renamed',description='',color='blue' where id=$1",[id]);
    expect((await db.query<{name:string}>("select name from public.habits where id=$1",[id])).rows[0].name).toBe("Renamed");
  });
  it("prevents cross-account reads and progress changes",async () => {
    const id=await create(); await record(id,1);
    await asUser(OTHER);
    expect((await db.query("select * from public.habits")).rows).toHaveLength(0);
    expect((await db.query("select * from public.habit_logs")).rows).toHaveLength(0);
    expect((await db.query("select * from public.habit_log_operations")).rows).toHaveLength(0);
    await expect(record(id,1)).rejects.toThrow(/unavailable/);
    await expect(db.query("insert into public.habit_logs(user_id,habit_id,completed_on) values($1,$2,current_date-1)",[OTHER,id])).rejects.toThrow(/foreign key/);
  });
  it("rolls back totals if the request receipt cannot be recorded",async () => {
    const id=await create(); await db.exec("reset role; alter table public.habit_log_operations add constraint fail_test check(value < 0);");
    try { await asUser(USER); await expect(record(id,1)).rejects.toThrow(/fail_test/); expect((await db.query("select * from public.habit_logs")).rows).toHaveLength(0); }
    finally { await db.exec("reset role; alter table public.habit_log_operations drop constraint fail_test;"); }
  });
  it("keeps archived history and allows safe replay but blocks new logging until restored",async () => {
    const id=await create(),op=randomUUID(); await record(id,2,op);
    await db.query("update public.habits set is_active=false where id=$1",[id]);
    expect((await record(id,2,op)).amount).toBe(2);
    await expect(record(id,1)).rejects.toThrow(/Restore/);
    await db.query("update public.habits set is_active=true where id=$1",[id]);
    expect((await record(id,1)).amount).toBe(3);
  });
  it("does not grant anonymous function access or direct receipt writes",async () => {
    const id=await create();
    await expect(db.query("insert into public.habit_log_operations(id,user_id,habit_id,completed_on,mode,value) values($1,$2,$3,current_date,'add',1)",[randomUUID(),USER,id])).rejects.toThrow(/permission denied/);
    await db.exec("reset role; set role anon;"); await expect(record(id,1)).rejects.toThrow(/permission denied/);
  });
});
