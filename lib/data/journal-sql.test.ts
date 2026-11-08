import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
const USER="11111111-1111-4111-8111-111111111111",OTHER="22222222-2222-4222-8222-222222222222",DAY="2026-11-07";
let db:PGlite;
beforeAll(async()=>{
  db=new PGlite();await db.exec(`
    create role authenticated;create role anon;create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated;
    create table public.projects(id uuid primary key,user_id uuid,status text);
    create table public.tasks(id uuid primary key,user_id uuid,title text,description text,status text,priority text,due_at timestamptz,project_id uuid);
    insert into auth.users values('${USER}'),('${OTHER}');
  `);
  await db.exec(readFileSync(new URL('../../database/migrations/20261107_001_inbox_focus.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../database/migrations/20261107_004_journal.sql',import.meta.url),'utf8'));
},30000);
beforeEach(async()=>{await db.exec('reset role;truncate public.journal_entries,public.journal_sources,public.journal_write_operations,public.inbox_notes,public.tasks,public.daily_focus;');await asUser(USER);});
afterAll(async()=>{await db?.close();});
async function asUser(id:string){await db.exec('reset role;set role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
async function note(body='A thought'){const id=randomUUID();await db.query('insert into public.inbox_notes(id,user_id,body) values($1,$2,$3)',[id,USER,body]);return id;}
interface Entry {id:string;user_id:string;entry_date:string;body:string;revision:number}
async function save(body:string,revision:number|null=null,id=randomUUID(),date=DAY){return (await db.query<{result:{entry:Entry|null;replayed:boolean}}>('select public.save_journal_entry($1,$2,$3,$4) as result',[id,date,revision,body])).rows[0].result;}
async function append(id:string,date=DAY,body='A thought'){return (await db.query<{result:{entry:Entry|null;source:{entry_id:string;entry_date:string};replayed:boolean}}>('select public.append_capture_to_journal($1,$2,$3) as result',[id,date,body])).rows[0].result;}
describe('Journal SQL (temporary local PostgreSQL)',()=>{
  it('creates one dated entry, preserves exact text and rejects stale creation/edit attempts',async()=>{
    const first=(await save('  My first entry\n')).entry!;expect(first.entry_date).toBe(DAY);expect(first.body).toBe('  My first entry\n');
    await expect(save('Overwrite')).rejects.toThrow(/changed/);const second=(await save('Revised',first.revision)).entry!;expect(second.id).toBe(first.id);expect(second.revision).toBe(2);
    await expect(save('Stale',first.revision)).rejects.toThrow(/changed/);expect((await db.query('select * from public.journal_entries')).rows).toHaveLength(1);
  });
  it('replays confirmed saves without overwriting later changes or inserting a second entry',async()=>{
    const request=randomUUID(),first=(await save('First',null,request)).entry!;
    const latest=(await save('Newer',first.revision)).entry!;const replay=await save('First',null,request);
    expect(replay.replayed).toBe(true);expect(replay.entry?.body).toBe('Newer');expect(replay.entry?.revision).toBe(latest.revision);
    await expect(save('Different',null,request)).rejects.toThrow(/different save/);
  });
  it('appends atomically once, preserves originals/task links, and returns the original destination on repeated dates',async()=>{
    await save('Opening paragraph');const id=await note();
    const task=(await db.query<{result:{task:{id:string}}}>("select public.convert_inbox_note($1,'Task','','low',null,null) as result",[id])).rows[0].result.task;
    const before=(await db.query<{converted_task_id:string}>('select * from public.inbox_notes where id=$1',[id])).rows[0];
    const added=await append(id);expect(added.entry?.body).toBe('Opening paragraph\n\nA thought');expect(added.entry?.revision).toBe(2);
    const replay=await append(id,'2026-11-08');expect(replay.replayed).toBe(true);expect(replay.source.entry_date).toBe(DAY);expect(replay.entry?.body).toBe(added.entry?.body);
    expect((await db.query('select * from public.inbox_notes where id=$1',[id])).rows[0]).toEqual(before);expect(before.converted_task_id).toBe(task.id);
    expect((await db.query('select * from public.journal_sources')).rows).toHaveLength(1);
  });
  it('supports journalling then making a task, with independent future edits',async()=>{
    const id=await note();await append(id);await db.query('update public.inbox_notes set body=$2 where id=$1',[id,'Edited original']);
    await db.query("select public.convert_inbox_note($1,'Task','','low',null,null)",[id]);
    expect((await db.query<{body:string}>('select body from public.journal_entries')).rows[0].body).toBe('A thought');
  });
  it('rejects a changed preview or archived capture without creating an empty journal entry',async()=>{
    const id=await note();await expect(append(id,DAY,'Stale text')).rejects.toThrow(/capture changed/);
    await db.query('update public.inbox_notes set archived_at=now() where id=$1',[id]);await expect(append(id)).rejects.toThrow(/Restore/);
    expect((await db.query('select * from public.journal_entries')).rows).toHaveLength(0);
  });
  it('protects a draft against an append from another device, and never loses either append',async()=>{
    const first=(await save('Initial')).entry!,a=await note('A'),b=await note('B');await append(a,DAY,'A');await append(b,DAY,'B');
    await expect(save('Stale draft',first.revision)).rejects.toThrow(/changed/);
    expect((await db.query<{body:string}>('select body from public.journal_entries')).rows[0].body).toBe('Initial\n\nA\n\nB');
  });
  it('rolls back journal text when source-receipt insertion fails',async()=>{
    const first=(await save('Keep')).entry!,id=await note();await db.exec("reset role;alter table public.journal_sources add constraint test_failure check(entry_date>'2030-01-01');");
    try{await asUser(USER);await expect(append(id)).rejects.toThrow(/test_failure/);expect((await db.query<{body:string}>('select body from public.journal_entries')).rows[0].body).toBe('Keep');}
    finally{await db.exec('reset role;alter table public.journal_sources drop constraint test_failure;');}
    await asUser(USER);expect((await db.query<{revision:number}>('select revision from public.journal_entries')).rows[0].revision).toBe(first.revision);
  });
  it('enforces ownership and rejects direct client writes/forged links',async()=>{
    const id=await note();await append(id);await asUser(OTHER);
    expect((await db.query('select * from public.journal_entries')).rows).toHaveLength(0);expect((await db.query('select * from public.journal_sources')).rows).toHaveLength(0);
    await expect(append(id)).rejects.toThrow(/no longer available/);await expect(save('Foreign overwrite',1)).rejects.toThrow(/changed/);
    await expect(db.query('update public.journal_entries set body=$1',['Bad'])).rejects.toThrow(/permission/);
    await expect(db.query('insert into public.journal_sources(user_id,note_id,entry_id,entry_date) values($1,$1,$1,$2)',[OTHER,DAY])).rejects.toThrow(/permission/);
    await db.exec('reset role;set role anon;');await expect(save('Anonymous')).rejects.toThrow(/permission/);
  });
  it('does not recreate entries after deletion or erase text if a source disappears',async()=>{
    const request=randomUUID(),entry=(await save('Keep after source disappears',null,request)).entry!,id=await note();await append(id);
    await db.exec('reset role;');await db.query('delete from public.inbox_notes where id=$1',[id]);await asUser(USER);
    expect((await append(id)).entry?.body).toContain('Keep after source disappears');
    await db.exec('reset role;');await db.query('delete from public.journal_entries where id=$1',[entry.id]);await asUser(USER);
    expect((await append(id)).entry).toBeNull();expect((await save('Keep after source disappears',null,request)).entry).toBeNull();
    expect((await db.query('select * from public.journal_entries')).rows).toHaveLength(0);
  });
  it('rejects oversized appends and protects old content and receipts',async()=>{
    await save('a'.repeat(99999));const id=await note();await expect(append(id)).rejects.toThrow(/check constraint/);
    expect((await db.query('select * from public.journal_sources')).rows).toHaveLength(0);
    expect((await db.query<{length:number}>('select length(body) as length from public.journal_entries')).rows[0].length).toBe(99999);
  });
  it('keeps different dates and accounts independent',async()=>{
    await save('Leap day',null,randomUUID(),'2028-02-29');await asUser(OTHER);await save('Other account',null,randomUUID(),'2028-02-29');await asUser(USER);
    expect((await db.query<{body:string;entry_date:string}>('select body,entry_date::text from public.journal_entries')).rows).toEqual([{body:'Leap day',entry_date:'2028-02-29'}]);
  });
  it('rejects two edits based on the same revision and keeps the first committed edit',async()=>{
    const first=(await save('Initial')).entry!;
    const results=await Promise.allSettled([save('Edit A',first.revision),save('Edit B',first.revision)]);
    expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);expect(results.filter(result=>result.status==='rejected')).toHaveLength(1);
    expect((await db.query<{revision:number}>('select revision from public.journal_entries')).rows[0].revision).toBe(2);
  });
  it('rolls back entry creation if recording its save receipt fails',async()=>{
    await db.exec('reset role;alter table public.journal_write_operations add constraint test_save_failure check(false);');
    try{await asUser(USER);await expect(save('Draft')).rejects.toThrow(/test_save_failure/);expect((await db.query('select * from public.journal_entries')).rows).toHaveLength(0);}
    finally{await db.exec('reset role;alter table public.journal_write_operations drop constraint test_save_failure;');}
  });
  it('enables RLS on every new table, keeps save receipts inaccessible, and rejects whitespace-only entries',async()=>{
    await expect(save(' \t\n')).rejects.toThrow(/Check the date/);await expect(db.query('select * from public.journal_write_operations')).rejects.toThrow(/permission/);
    await db.exec('reset role;');const result=await db.query<{relrowsecurity:boolean}>("select relrowsecurity from pg_class where oid in ('public.journal_entries'::regclass,'public.journal_sources'::regclass,'public.journal_write_operations'::regclass)");
    expect(result.rows).toHaveLength(3);expect(result.rows.every(row=>row.relrowsecurity)).toBe(true);
  });
});
