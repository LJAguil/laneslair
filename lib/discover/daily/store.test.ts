import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readStore, writeStore } from "../../../scripts/discover/daily-store.mjs";

beforeEach(() => {
  vi.stubEnv("GITHUB_ACTIONS", "true");
  vi.stubEnv("GITHUB_REPOSITORY", "LJAguil/laneslair");
  vi.stubEnv("GITHUB_TOKEN", "invented-test-token");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

describe("public data branch persistence (mocked GitHub only)", () => {
  it("treats a missing branch as uninitialized but does not reset a damaged existing branch", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 404)));
    expect(await readStore()).toEqual({ head: null, text: null });
    const fetcher = vi.fn().mockResolvedValueOnce(json({ object: { sha: "invented-old" } })).mockResolvedValueOnce(json({}, 404));
    vi.stubGlobal("fetch", fetcher);
    await expect(readStore()).rejects.toThrow("invalid-data-store");
  });
  it("stores only catalog data and deployment exclusion, without overwriting app code or forcing a ref", async () => {
    const calls: { url: string; method: string; body: Record<string, unknown> | null }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      const method = init.method ?? "GET", body = init.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method, body });
      if (method === "GET") return json({ object: { sha: "invented-old" } });
      if (url.endsWith("git/trees")) return json({ sha: "invented-tree" });
      if (url.endsWith("git/commits")) return json({ sha: "invented-new" });
      return json({});
    }));
    expect(await writeStore('{"invented":"public metadata"}', "invented-old")).toBe("invented-new");
    const tree = calls.find(call => call.url.endsWith("git/trees"))!.body!.tree as { path: string; content: string }[];
    expect(tree.map(item => item.path)).toEqual(["catalog.json", "vercel.json"]);
    expect(JSON.parse(tree[1].content)).toEqual({ git: { deploymentEnabled: false } });
    expect(calls.at(-1)).toMatchObject({ method: "PATCH", body: { sha: "invented-new", force: false } });
    expect(calls.every(call => !call.url.includes("invented-test-token"))).toBe(true);
  });
  it("stops before creating Git objects if another writer moved the data branch", async () => {
    const fetcher = vi.fn(async () => json({ object: { sha: "invented-concurrent" } }));
    vi.stubGlobal("fetch", fetcher);
    await expect(writeStore("{}", "invented-old")).rejects.toThrow("data-store-conflict");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("refuses live storage operations outside the named workflow repository", async () => {
    vi.stubEnv("GITHUB_REPOSITORY", "invented/fork");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(readStore()).rejects.toThrow("workflow-only");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
