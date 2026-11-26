import { describe, expect, it, vi } from "vitest";
import { DiscoverLibrarySession, entertainmentDraft } from "./entertainment";
import { emptyInput, type EntertainmentItem } from "../entertainment/model";
import type { EntertainmentRepository } from "../entertainment/repository";
import type { DiscoverTitle } from "./types";

const pick: DiscoverTitle = { title: "Invented Game", media: "game", platform: "PC", release: "Upcoming; date not announced." };
const url = "https://example.org/announcements/invented";
function setup(initial: EntertainmentItem[] = []) {
  const records = new Map(initial.map(item => [item.id, item]));
  const repo: EntertainmentRepository = { load: vi.fn(async () => [...records.values()]), save: vi.fn(async (id, input) => { const row = { ...input, id, user_id: "owner-a" }; records.set(id, row); return row; }), remove: vi.fn() };
  const uuid = vi.fn(() => "invented-stable-id");
  return { repo, records, uuid, session: new DiscoverLibrarySession(repo, "owner-a", uuid) };
}
describe("Discover to Entertainment (mocked repository only)", () => {
  it("builds Planned entries for all media with no guessed progress and anime tagged as shows", () => {
    for (const media of ["game", "movie", "show"] as const) {
      const draft = entertainmentDraft({ ...pick, media, anime: media === "show" }, url);
      expect(draft).toMatchObject({ title: pick.title, media, status: "planned", season: null, episode: null, progress: "", minutes: null, priority: 1 });
      expect(draft.note).toContain(url);
      expect(draft.tags).toEqual(media === "show" ? ["anime", "discover"] : ["discover"]);
    }
    expect(() => entertainmentDraft({ ...pick, title: "<script>" }, url)).toThrow();
    expect(() => entertainmentDraft(pick, "javascript:invented")).toThrow();
  });
  it("does not write on opening, and preserves duplicate statuses, notes and archived entries", async () => {
    const original = { ...emptyInput, id: "existing", user_id: "owner-a", title: "  INVENTED   GAME ", media: "game" as const, status: "finished" as const, note: "Keep my personal note", archived: true };
    const { session, repo, records } = setup([original]);
    await session.open(pick, url);
    expect(session.getSnapshot()).toMatchObject({ phase: "exists", existing: { archived: true } });
    expect(await session.save()).toBe(false);
    expect(repo.save).not.toHaveBeenCalled(); expect(records.get(original.id)).toEqual(original);
  });
  it("keeps a stable identity across lost responses, retry and closing/reopening", async () => {
    const { session, repo, records, uuid } = setup();
    await session.open(pick, url);
    const save = vi.mocked(repo.save);
    vi.mocked(repo.save).mockImplementationOnce(async (id, input) => { records.set(id, { ...input, id, user_id: "owner-a" }); throw Error("lost response"); });
    expect(await session.save()).toBe(false);
    expect(session.getSnapshot()).toMatchObject({ phase: "ready", draft: { title: pick.title } });
    expect(await session.save()).toBe(true);
    expect(save).toHaveBeenCalledTimes(2); expect(records.size).toBe(1);
    expect(save.mock.calls[0][0]).toBe(save.mock.calls[1][0]);
    session.close(); await session.open(pick, url);
    expect(uuid).toHaveBeenCalledTimes(1); expect(session.getSnapshot().phase).toBe("exists");
  });
  it("does not permit saving after a failed duplicate check or repeated save clicks", async () => {
    const { session, repo } = setup();
    vi.mocked(repo.load).mockRejectedValueOnce(Error("offline"));
    await session.open(pick, url); expect(await session.save()).toBe(false); expect(repo.save).not.toHaveBeenCalled();
    await session.open(pick, url);
    let finish!: (item: EntertainmentItem) => void;
    vi.mocked(repo.save).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = session.save(); expect(await session.save()).toBe(false);
    finish({ ...emptyInput, title: pick.title, media: "game", id: "invented-stable-id", user_id: "owner-a" });
    expect(await pending).toBe(true); expect(repo.save).toHaveBeenCalledTimes(1);
  });
  it("fences late reads/writes on account change or unmount and refuses mismatched saved owners", async () => {
    const { session, repo } = setup();
    let read!: (rows: EntertainmentItem[]) => void;
    vi.mocked(repo.load).mockImplementationOnce(() => new Promise(resolve => { read = resolve; }));
    const checking = session.open(pick, url); session.expire(); read([]); await checking;
    expect(session.getSnapshot()).toMatchObject({ phase: "expired", draft: null }); expect(await session.save()).toBe(false);
    session.activate(); await session.open(pick, url);
    let write!: (row: EntertainmentItem) => void;
    vi.mocked(repo.save).mockImplementationOnce(() => new Promise(resolve => { write = resolve; }));
    const saving = session.save(); session.expire(); write({ ...emptyInput, title: pick.title, id: "invented-stable-id", user_id: "owner-a" });
    expect(await saving).toBe(false); expect(session.getSnapshot().draft).toBeNull();
    session.activate(); await session.open(pick, url);
    vi.mocked(repo.save).mockResolvedValueOnce({ ...emptyInput, title: pick.title, id: "invented-stable-id", user_id: "owner-b" });
    expect(await session.save()).toBe(false); expect(session.getSnapshot().phase).toBe("ready");
  });
  it("ignores another owner's rows returned during duplicate checking", async () => {
    const { session } = setup([{ ...emptyInput, title: pick.title, media: "game", id: "other", user_id: "owner-b" }]);
    await session.open(pick, url); expect(session.getSnapshot().phase).toBe("ready");
  });
});
