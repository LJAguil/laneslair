// Runs the actual proposed SQL in disposable in-memory PostgreSQL. Never uses Supabase.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated;
    create table public.projects (
      id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users,
      name text not null, description text not null default '', status text not null default 'active',
      due_date date, created_at timestamptz default now(), updated_at timestamptz default now(),
      unique(id,user_id), check(status in ('active','paused','completed','archived'))
    );
    -- Exercise enum-backed tasks as well as the inspected text-backed project statuses.
    create type public.test_task_status as enum ('todo','in_progress','done','cancelled');
    create type public.test_priority as enum ('low','medium','high','urgent');
    create table public.tasks (
      id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users,
      title text not null, description text not null default '',
      status public.test_task_status not null default 'todo', priority public.test_priority not null default 'medium',
      due_at timestamptz, project_id uuid, completed_at timestamptz,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      foreign key(project_id,user_id) references public.projects(id,user_id) on delete restrict
    );
    alter table public.tasks enable row level security;
    alter table public.projects enable row level security;
    create policy own on public.tasks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy own on public.projects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
    grant select,insert,update,delete on public.tasks,public.projects to authenticated;
    insert into auth.users values ('${USER}'),('${OTHER}');
  `);
  await db.exec(readFileSync(new URL("../../database/migrations/20261107_001_inbox_focus.sql", import.meta.url), "utf8"));
}, 30000);
beforeEach(async () => {
  await db.exec("reset role; truncate public.inbox_notes,public.daily_focus,public.tasks,public.projects;");
  await asUser(USER);
});
afterAll(async () => { await db?.close(); });

async function asUser(id: string) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function note(body = "Remember this idea") {
  return (await db.query<{ id: string }>("insert into public.inbox_notes(user_id,body) values ($1,$2) returning id", [USER, body])).rows[0].id;
}
async function convert(id: string, project: string | null = null) {
  const result = await db.query<{ result: { note: { body: string; converted_task_id: string }; task: { id: string; description: string; user_id: string; due_at: string | null } | null } }>(
    "select public.convert_inbox_note($1,$2,$3,$4,$5,$6) as result", [id, "New task", "", "medium", null, project]);
  return result.rows[0].result;
}

describe("Inbox SQL and ownership", () => {
  it("restricts notes to their owner and forbids forged ownership", async () => {
    const id = await note();
    await asUser(OTHER);
    expect((await db.query("select * from public.inbox_notes")).rows).toHaveLength(0);
    expect((await db.query("update public.inbox_notes set body='changed' where id=$1 returning id", [id])).rows).toHaveLength(0);
    await expect(db.query("insert into public.inbox_notes(user_id,body) values ($1,'forged')", [USER])).rejects.toThrow(/row-level security/i);
    await expect(convert(id)).rejects.toThrow(/not found/i);
  });

  it("does not grant anonymous access or direct writes to conversion fields", async () => {
    await db.exec("reset role;");
    const privileges = await db.query<{ allowed: boolean }>("select has_table_privilege('anon','public.inbox_notes','SELECT') as allowed");
    expect(privileges.rows[0].allowed).toBe(false);
    await asUser(USER);
    const id = await note();
    await expect(db.query("update public.inbox_notes set converted_at=now() where id=$1", [id])).rejects.toThrow(/permission denied/i);
    await db.exec("reset role; set role anon;");
    await expect(convert(id)).rejects.toThrow(/permission denied/i);
  });

  it("converts once, keeps the original, and safely replays a lost response", async () => {
    const id = await note("Full original capture\nwith another line");
    const first = await convert(id);
    const replay = await convert(id);
    expect(first.task?.id).toBe(replay.task?.id);
    expect(first.note.body).toBe("Full original capture\nwith another line");
    expect(first.task).toMatchObject({ user_id: USER, description: "" });
    expect(first.note.converted_task_id).toBe(first.task?.id);
    expect((await db.query("select * from public.tasks")).rows).toHaveLength(1);
  });

  it("rolls back task creation when recording the link fails", async () => {
    const id = await note();
    await db.exec("reset role; alter table public.inbox_notes add constraint test_reject_link check(converted_at is null);");
    try {
      await asUser(USER);
      await expect(convert(id)).rejects.toThrow(/test_reject_link/);
      expect((await db.query("select * from public.tasks")).rows).toHaveLength(0);
      const capture = await db.query<{ converted_task_id: string | null }>("select converted_task_id from public.inbox_notes where id=$1", [id]);
      expect(capture.rows[0].converted_task_id).toBeNull();
    } finally {
      await db.exec("reset role; alter table public.inbox_notes drop constraint test_reject_link;");
    }
  });

  it("does not recreate a converted task that was later deleted", async () => {
    const id = await note();
    const first = await convert(id);
    await db.query("delete from public.tasks where id=$1", [first.task!.id]);
    const replay = await convert(id);
    expect(replay.task).toBeNull();
    expect(replay.note.converted_task_id).toBe(first.task!.id);
    expect((await db.query("select * from public.tasks")).rows).toHaveLength(0);
  });

  it("requires restoring an archived capture before conversion", async () => {
    const id = await note();
    await db.query("update public.inbox_notes set archived_at=now() where id=$1", [id]);
    await expect(convert(id)).rejects.toThrow(/Restore/);
    await db.query("update public.inbox_notes set archived_at=null where id=$1", [id]);
    expect((await convert(id)).task).not.toBeNull();
  });

  it("rejects another owner's project and archived projects without creating tasks", async () => {
    const id = await note();
    await asUser(OTHER);
    const project = (await db.query<{ id: string }>("insert into public.projects(user_id,name) values ($1,'Other') returning id", [OTHER])).rows[0].id;
    await asUser(USER);
    await expect(convert(id, project)).rejects.toThrow(/available project/);
    const archived = (await db.query<{ id: string }>("insert into public.projects(user_id,name,status) values ($1,'Old','archived') returning id", [USER])).rows[0].id;
    await expect(convert(id, archived)).rejects.toThrow(/available project/);
    expect((await db.query("select * from public.tasks")).rows).toHaveLength(0);
    const own = (await db.query<{ id: string }>("insert into public.projects(user_id,name) values ($1,'Own') returning id", [USER])).rows[0].id;
    expect((await convert(id, own)).task).not.toBeNull();
  });

  it("rejects another user's focus task, persists own focus, and clears on task deletion", async () => {
    await asUser(OTHER);
    const otherTask = (await db.query<{ id: string }>("insert into public.tasks(user_id,title) values ($1,'Other') returning id", [OTHER])).rows[0].id;
    await asUser(USER);
    await expect(db.query("insert into public.daily_focus(user_id,task_id,focus_date) values ($1,$2,'2026-11-07')", [USER, otherTask])).rejects.toThrow(/row-level security/i);
    const ownTask = (await convert(await note())).task!.id;
    await db.query("insert into public.daily_focus(user_id,task_id,focus_date) values ($1,$2,'2026-11-07')", [USER, ownTask]);
    await db.query("delete from public.tasks where id=$1", [ownTask]);
    expect((await db.query<{ task_id: string | null }>("select task_id from public.daily_focus")).rows[0].task_id).toBeNull();
    await asUser(OTHER);
    expect((await db.query("select * from public.daily_focus")).rows).toHaveLength(0);
  });
});
