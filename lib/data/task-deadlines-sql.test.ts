// Disposable invented PostgreSQL only. Never connects to Supabase.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
const USER = "11111111-1111-4111-8111-111111111111", OTHER = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated; create role anon; create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated;
    create table public.projects(id uuid primary key,user_id uuid,status text);
    create table public.tasks(id uuid primary key default gen_random_uuid(),user_id uuid,title text,description text,status text,priority text,due_at timestamptz,project_id uuid,created_at timestamptz default now(),updated_at timestamptz default now(),completed_at timestamptz);
    alter table public.tasks enable row level security;
    create policy own on public.tasks for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
    grant select,insert,update,delete on public.tasks to authenticated;
    grant select on public.projects to authenticated;
    insert into auth.users values('${USER}'),('${OTHER}');
    insert into public.tasks(user_id,title,due_at) values('${USER}','Invented existing noon','2026-11-11T18:00:00Z');
  `);
  await db.exec(readFileSync(new URL("../../database/migrations/20261107_001_inbox_focus.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../database/migrations/20261111191120_optional_task_due_times.sql", import.meta.url), "utf8"));
}, 30000);
afterAll(async () => { await db?.close(); });
async function asUser(id: string) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function note() {
  return (await db.query<{ id: string }>("insert into public.inbox_notes(user_id,body) values($1,'Invented note') returning id", [USER])).rows[0].id;
}
async function convert(id: string, due: string | null = "2026-11-11T18:00:00Z") {
  return (await db.query<{ result: { task: { id: string; due_has_time: boolean; due_at: string } | null } }>("select public.convert_inbox_note_timed($1,'Invented task','','medium',$2,null) result", [id,due])).rows[0].result;
}
describe("optional deadline SQL", () => {
  it("keeps existing tasks date-only and rejects time without a deadline", async () => {
    await asUser(USER);
    expect((await db.query<{ due_has_time: boolean }>("select due_has_time from public.tasks")).rows[0].due_has_time).toBe(false);
    await expect(db.exec("insert into public.tasks(user_id,due_has_time) values(auth.uid(),true)")).rejects.toThrow(/tasks_timed_due_requires_date/);
  });
  it("converts atomically, preserves the original, and replays without changing deadlines", async () => {
    await asUser(USER);
    const id = await note(), first = await convert(id);
    expect(first.task?.due_has_time).toBe(true);
    expect((await convert(id, "2026-11-12T18:00:00Z")).task).toEqual(first.task);
    expect((await db.query("select body from public.inbox_notes where id=$1", [id])).rows[0]).toEqual({ body: "Invented note" });
    await db.query("delete from public.tasks where id=$1", [first.task!.id]);
    expect((await convert(id)).task).toBeNull();
  });
  it("checks ownership and anonymous execution", async () => {
    await asUser(USER); const id = await note();
    await asUser(OTHER); await expect(convert(id)).rejects.toThrow(/not found/);
    await db.exec("reset role; set role anon;");
    await expect(convert(id)).rejects.toThrow(/permission denied/);
  });
  it("rolls conversion and linking back if the timed update fails", async () => {
    await asUser(USER); const id = await note();
    await db.exec("reset role; create function reject_timed() returns trigger language plpgsql as $$ begin if new.due_has_time then raise exception 'Invented rejection'; end if; return new; end $$; create trigger reject_timed before update on public.tasks for each row execute function reject_timed();");
    await asUser(USER); await expect(convert(id)).rejects.toThrow(/Invented rejection/);
    expect((await db.query("select converted_at from public.inbox_notes where id=$1", [id])).rows[0]).toEqual({ converted_at: null });
    expect((await db.query("select id from public.tasks where title='Invented task'")).rows).toHaveLength(0);
  });
});
