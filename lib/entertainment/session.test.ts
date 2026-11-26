import { expect, it, vi } from "vitest";
import { emptyInput, type EntertainmentItem } from "./model";
import { LibrarySession } from "./session";
import type { EntertainmentRepository } from "./repository";
const a: EntertainmentItem = { ...emptyInput, id: "stable-id", user_id: "owner-a", title: "Clockwork Orchard" };
const setup = () => {
  const records = new Map<string, EntertainmentItem>();
  const repo: EntertainmentRepository = { load: vi.fn(async () => [...records.values()]), save: vi.fn(async (id, input) => { const saved = { ...input, id, user_id: "owner-a" }; records.set(id, saved); return saved; }), remove: vi.fn(async id => { records.delete(id); }) };
  return { records, repo, session: new LibrarySession(repo, "owner-a") };
};
it("preserves failed input and confirmed state; retry uses same identity and survives a new session", async () => {
  const { repo, session, records } = setup();
  await session.load();
  vi.mocked(repo.save).mockImplementationOnce(async (id, input) => { records.set(id, { ...input, id, user_id: "owner-a" }); throw new Error("response lost"); });
  const draft = { ...a };
  expect(await session.save(a.id, draft)).toBe(false);
  expect(draft.title).toBe(a.title);
  expect(session.snapshot.items).toEqual([]);
  expect(await session.save(a.id, draft)).toBe(true);
  expect(records.size).toBe(1);
  const reloaded = new LibrarySession(repo, "owner-a"); await reloaded.load();
  expect(reloaded.snapshot.items).toEqual([a]);
  expect(await reloaded.save(a.id, { ...a, archived: true })).toBe(true);
  expect(reloaded.snapshot.items[0].archived).toBe(true);
  expect(await reloaded.save(a.id, a)).toBe(true);
  expect(await reloaded.remove(a.id)).toBe(true);
  await session.load(); expect(session.snapshot.items).toEqual([]);
});
it("retries failed reads without presenting an empty library as loaded", async () => {
  const { repo, session } = setup(); vi.mocked(repo.load).mockRejectedValueOnce(new Error("offline"));
  await session.load(); expect(session.snapshot.status).toBe("error");
  await session.load(); expect(session.snapshot.status).toBe("ready");
});
it("fences late reads/writes and strips other-account rows", async () => {
  const { repo, session } = setup();
  vi.mocked(repo.load).mockResolvedValueOnce([a, { ...a, id: "b", user_id: "owner-b" }]);
  await session.load(); expect(session.snapshot.items).toEqual([a]);
  let resolve!: (item: EntertainmentItem) => void;
  vi.mocked(repo.save).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const pending = session.save(a.id, a); session.expire(); resolve(a);
  expect(await pending).toBe(false); expect(session.snapshot.items).toEqual([]);
  expect(await session.save(a.id, a)).toBe(false);
  session.activate();
  let read!: (items: EntertainmentItem[]) => void;
  vi.mocked(repo.load).mockImplementationOnce(() => new Promise(done => { read = done; }));
  const loading = session.load(); session.expire(); read([a]); await loading;
  expect(session.snapshot.status).toBe("expired"); expect(session.snapshot.items).toEqual([]);
});
it("blocks double submissions and failed deletion keeps the row", async () => {
  const { repo, session } = setup(); await session.load(); await session.save(a.id, a);
  vi.mocked(repo.remove).mockRejectedValueOnce(new Error("offline"));
  expect(await session.remove(a.id)).toBe(false); expect(session.snapshot.items).toEqual([a]);
  let resolve!: (item: EntertainmentItem) => void;
  vi.mocked(repo.save).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const pending = session.save(a.id, a); expect(await session.save(a.id, a)).toBe(false); resolve(a); await pending;
});
it("can restart after the development Strict Mode cleanup without accepting older responses", async () => {
  const { session } = setup();
  session.activate(); session.expire(); session.activate(); await session.load();
  expect(session.snapshot.status).toBe("ready");
  expect(await session.save(a.id, a)).toBe(true);
});
