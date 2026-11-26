import { expect, it, vi } from "vitest";
import { emptyInput, normalize, type EntertainmentItem } from "@/lib/entertainment/model";
import type { EntertainmentRepository } from "@/lib/entertainment/repository";
import { makePlan, runChecks, verifyRefresh, type CheckResult, type RefreshReceipt } from "./checks";
import type { Fault } from "./guard";

function setup() {
  let count = 0, fault: Fault = "none";
  const plan = makePlan(() => `11111111-1111-4111-8111-${String(++count).padStart(12, "0")}`);
  const other: EntertainmentItem = { ...emptyInput, id: "other", user_id: "owner", title: "Invented unrelated fixture" };
  const rows = new Map([[other.id, other]]), reports: CheckResult[] = [];
  const repository: EntertainmentRepository = {
    load: vi.fn(async () => [...rows.values()]),
    save: vi.fn(async (id, input) => {
      const next = fault; fault = "none";
      if (next === "fail_save") throw new Error("Synthetic before-write failure");
      const item = { ...normalize(input), id, user_id: "owner" }; rows.set(id, item);
      if (next === "lose_response") throw new Error("Synthetic lost response");
      return item;
    }), remove: vi.fn(async () => { throw new Error("No deletion is part of acceptance"); }),
  };
  const options = { repository, owner: "owner", plan, armFault: (next: Fault) => { fault = next; }, report: (result: CheckResult) => reports.push(result) };
  return { rows, reports, repository, options, other };
}
it("checks real save/retry boundaries, all statuses and archive/restore without deleting or changing unrelated fixtures", async () => {
  const t = setup(), expected = await runChecks(t.options);
  expect(t.rows.size).toBe(4);
  expect(t.rows.get(t.other.id)).toEqual(t.other);
  expect(t.repository.remove).not.toHaveBeenCalled();
  expect(t.reports.filter(row => row.status === "passed")).toHaveLength(7);
  expect(t.reports.some(row => row.status === "failed")).toBe(false);
  const receipt: RefreshReceipt = { version: 1, page: "before-refresh", expected };
  await expect(verifyRefresh(t.repository, receipt, "after-refresh")).resolves.toBeUndefined();
  expect(expected[0]).toMatchObject({ status: "in_progress", season: 2, episode: 4 });
  expect(expected[1]).toMatchObject({ archived: false, progress: "Reached the invented silver gate." });
});
it("stops at a failed write and never reports a false pass or starts later steps", async () => {
  const t = setup(); vi.mocked(t.repository.save).mockRejectedValueOnce(new Error("Offline"));
  await expect(runChecks(t.options)).rejects.toThrow(/Save movie/);
  expect(t.repository.save).toHaveBeenCalledOnce();
  expect(t.reports.at(-1)?.status).toBe("failed");
});
it("does not report fault recovery as passing when the fault was never injected", async () => {
  const t = setup();
  await expect(runChecks({ ...t.options, armFault: () => {} })).rejects.toThrow(/failed save/);
  expect(t.reports.at(-1)).toMatchObject({ status: "failed" });
});
it("requires an actual new page and checks exact persisted fields using read-only verification", async () => {
  const t = setup(), expected = await runChecks(t.options), receipt: RefreshReceipt = { version: 1, page: "same-page", expected };
  const writes = vi.mocked(t.repository.save).mock.calls.length;
  await expect(verifyRefresh(t.repository, receipt, "same-page")).rejects.toThrow();
  const show = t.rows.get(expected[0].id)!; t.rows.set(show.id, { ...show, episode: 99 });
  await expect(verifyRefresh(t.repository, receipt, "new-page")).rejects.toThrow();
  expect(vi.mocked(t.repository.save).mock.calls).toHaveLength(writes);
});
it("cancels before further writes when the active account/view changes", async () => {
  const t = setup(); let active = true;
  const original = t.repository.save;
  t.repository.save = vi.fn(async (id, input) => { const saved = await original(id, input); active = false; return saved; });
  await expect(runChecks({ ...t.options, isCurrent: () => active })).rejects.toThrow();
  expect(t.repository.save).toHaveBeenCalledOnce();
  expect(t.reports.filter(row => row.status === "passed")).toHaveLength(1);
});
it("rejects mismatched owners and duplicate or non-synthetic plans", async () => {
  const t = setup();
  await expect(runChecks({ ...t.options, plan: [t.options.plan[0], t.options.plan[0], t.options.plan[2]] })).rejects.toThrow();
  expect(t.repository.save).not.toHaveBeenCalled();
  vi.mocked(t.repository.save).mockResolvedValueOnce({ ...t.options.plan[0], user_id: "another-owner" });
  await expect(runChecks(t.options)).rejects.toThrow(/Save movie/);
});
