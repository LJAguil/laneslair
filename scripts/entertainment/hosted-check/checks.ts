import { emptyInput, normalize, type EntertainmentInput, type EntertainmentItem } from "@/lib/entertainment/model";
import { LibrarySession } from "@/lib/entertainment/session";
import type { EntertainmentRepository } from "@/lib/entertainment/repository";
import { TEST_PREFIX, type Fault } from "./guard";

export interface ExpectedTitle extends EntertainmentInput { id: string; }
export interface CheckResult { label: string; status: "running" | "passed" | "failed"; }
export interface RefreshReceipt { version: 1; page: string; expected: ExpectedTitle[]; }
const fields = Object.keys(emptyInput) as (keyof EntertainmentInput)[];

function requireCheck(condition: boolean): asserts condition {
  if (!condition) throw new Error("The persistence check did not match its expected result.");
}
function matches(actual: EntertainmentItem | undefined, expected: ExpectedTitle) {
  return !!actual && fields.every(field => JSON.stringify(actual[field]) === JSON.stringify(expected[field]));
}
export function makePlan(makeId: () => string = () => crypto.randomUUID()): ExpectedTitle[] {
  return [
    { ...emptyInput, id: makeId(), title: `${TEST_PREFIX}Copper Observatory`, media: "show", status: "in_progress", season: 2, episode: 4, minutes: 25, tags: ["cozy", "mystery"], note: "Invented show acceptance note." },
    { ...emptyInput, id: makeId(), title: `${TEST_PREFIX}Glass Tides`, media: "game", status: "in_progress", minutes: 20, progress: "Reached the invented silver gate.", platform: "Invented test platform" },
    { ...emptyInput, id: makeId(), title: `${TEST_PREFIX}Paper Comet`, priority: 2, tags: ["cozy"] },
  ];
}

/** No auth/admin operations or deletion. Called only by an explicit test-page action. */
export async function runChecks(options: {
  repository: EntertainmentRepository; owner: string; plan: ExpectedTitle[];
  armFault: (fault: Fault) => void; report: (result: CheckResult) => void;
  isCurrent?: () => boolean;
}): Promise<ExpectedTitle[]> {
  const { repository, owner, armFault, report } = options;
  const current = options.isCurrent ?? (() => true);
  requireCheck(options.plan.length === 3 && new Set(options.plan.map(item => item.id)).size === 3);
  requireCheck(options.plan.every(item => item.title.startsWith(TEST_PREFIX)));
  const expected = options.plan.map(item => ({ ...normalize(item), id: item.id }));
  const session = new LibrarySession(repository, owner);
  function active() { requireCheck(current()); }
  async function step(label: string, action: () => Promise<void>) {
    active(); report({ label, status: "running" });
    try { await action(); active(); report({ label, status: "passed" }); }
    catch { if (current()) report({ label, status: "failed" }); throw new Error(`Check stopped: ${label}`); }
  }
  async function save(item: ExpectedTitle) {
    active(); requireCheck(await session.save(item.id, item)); active();
    requireCheck(matches(session.snapshot.items.find(row => row.id === item.id), item));
  }
  armFault("none");
  try {
    await step("Load scoped test library", async () => { await session.load(); requireCheck(session.snapshot.status === "ready"); });
    await step("Save movie, show and game with optional details", async () => { for (const item of expected) await save(item); });
    await step("Keep show progress through every status", async () => {
      for (const status of ["planned", "in_progress", "finished", "dropped", "in_progress"] as const) await save({ ...expected[0], status });
    });
    await step("Recover from a failed save without losing the draft", async () => {
      const previous = expected[0], draft = { ...previous, note: "Invented note preserved through a failed save." };
      active(); armFault("fail_save"); requireCheck(!await session.save(draft.id, draft)); active();
      requireCheck(matches(session.snapshot.items.find(row => row.id === previous.id), previous));
      requireCheck(draft.note === "Invented note preserved through a failed save.");
      await save(draft); expected[0] = draft;
    });
    await step("Retry a lost response without duplicating the title", async () => {
      const draft = { ...expected[2], note: "Invented response-loss retry note." };
      active(); armFault("lose_response"); requireCheck(!await session.save(draft.id, draft)); active();
      await save(draft); expected[2] = draft;
    });
    await step("Archive and restore game progress", async () => { await save({ ...expected[1], archived: true }); await save(expected[1]); });
    await step("Read exact saved values through a fresh library session", async () => {
      active(); const reloaded = new LibrarySession(repository, owner); await reloaded.load(); active();
      requireCheck(reloaded.snapshot.status === "ready");
      for (const item of expected) {
        const rows = reloaded.snapshot.items.filter(row => row.id === item.id);
        requireCheck(rows.length === 1 && matches(rows[0], item));
      }
    });
    return expected;
  } finally { armFault("none"); session.expire(); }
}

/** Read-only: verifies a prior run after an actual document reload. */
export async function verifyRefresh(repository: EntertainmentRepository, receipt: RefreshReceipt, currentPage: string) {
  requireCheck(receipt.version === 1 && receipt.page !== currentPage && receipt.expected.length === 3);
  requireCheck(new Set(receipt.expected.map(item => item.id)).size === 3);
  requireCheck(receipt.expected.every(item => item.title.startsWith(TEST_PREFIX)));
  const actual = await repository.load();
  for (const item of receipt.expected) {
    const rows = actual.filter(row => row.id === item.id);
    requireCheck(rows.length === 1 && matches(rows[0], item));
  }
}
