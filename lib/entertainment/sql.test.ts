import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222", ID = "33333333-3333-4333-8333-333333333333";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema public,auth to authenticated,anon; insert into auth.users values ('${A}'),('${B}');`);
  await db.exec(readFileSync(new URL("../../docs/entertainment/schema-proposal.sql", import.meta.url), "utf8"));
}, 30000);
afterAll(async () => { await db?.close(); });
async function as(owner: string) { await db.exec("reset role; set role authenticated"); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]); }
it("persists owned records, isolates accounts, prevents reassignment and forbids anonymous access", async () => {
  await as(A);
  await db.query("insert into entertainment_items(id,title,media) values ($1,'The Lantern Circuit','show')", [ID]);
  await db.query("update entertainment_items set status='in_progress',season=2,episode=4 where id=$1", [ID]);
  expect((await db.query<{ episode: number }>("select episode from entertainment_items")).rows[0].episode).toBe(4);
  await expect(db.query("update entertainment_items set user_id=$1", [B])).rejects.toThrow();
  await as(B); expect((await db.query("select * from entertainment_items")).rows).toEqual([]);
  expect((await db.query("update entertainment_items set title='Intrusion' returning id")).rows).toEqual([]);
  expect((await db.query("delete from entertainment_items returning id")).rows).toEqual([]);
  await expect(db.query("insert into entertainment_items(id,user_id,title,media) values ($1,$2,'Intrusion','movie')", [ID, A])).rejects.toThrow();
  await expect(db.query("insert into entertainment_items(id,title,media) values ($1,'Intrusion','movie') on conflict(id) do update set title=excluded.title", [ID])).rejects.toThrow();
  await as(A); expect((await db.query("select title from entertainment_items")).rows).toHaveLength(1);
  await db.exec("set role anon"); await expect(db.query("select * from entertainment_items")).rejects.toThrow();
});
it("supports idempotent upsert identity, archive/restore/delete and rejects invalid progress", async () => {
  await as(A);
  await db.query("insert into entertainment_items(id,title,media) values ($1,'The Lantern Circuit','show') on conflict(id) do update set title=excluded.title", [ID]);
  expect((await db.query("select id from entertainment_items")).rows).toHaveLength(1);
  await expect(db.query("update entertainment_items set minutes=0")).rejects.toThrow();
  await expect(db.query("update entertainment_items set media='movie' where id=$1", [ID])).rejects.toThrow();
  await db.exec("update entertainment_items set archived=true; update entertainment_items set archived=false;");
  await db.query("delete from entertainment_items where id=$1", [ID]);
  expect((await db.query("select * from entertainment_items")).rows).toEqual([]);
});
