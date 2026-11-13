import { afterEach, describe, expect, it, vi } from "vitest";

const originalExit = process.exitCode;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); process.exitCode = originalExit; });

describe("manual capture command guardrails (no filesystem or network execution)", () => {
  it("is inert on module import and help", async () => {
    const fetcher = vi.fn(() => { throw new Error("Network forbidden"); }); vi.stubGlobal("fetch", fetcher);
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const { main } = await import("../../../scripts/discover/capture-nasa.mjs");
    expect(out).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
    await main(["--help"]);
    expect(out).toHaveBeenCalledWith(expect.stringContaining("Usage:")); expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    [], ["capture"], ["capture", "--manual"], ["capture", "--manual", "--single-operator", "--now", "2026-11-12T18:00:00.000Z"],
    ["observe", "--manual"], ["status", "--manual", "--single-operator"],
    ["sample", "--manual"], ["capture", "--manual", "--manual"], ["capture", "--url", "https://example.invalid"],
    ["sample", "--output", "../outside"], ["unknown"],
    ["reconcile", "--manual", "--single-operator"],
    ["reconcile", "--manual", "--single-operator", "--expected-state", "../outside", "--revision", "1", "--pending", "capture-2"],
    ["reconcile", "--manual", "--single-operator", "--expected-state", "0".repeat(64), "--revision", "1.5", "--pending", "capture-2"],
    ["reconcile", "--manual", "--single-operator", "--expected-state", "0".repeat(64), "--revision", "2", "--pending", "capture-2", "--now", "future"],
  ].map(args => ({ args })))("rejects unsafe, unknown or incomplete arguments %# before executing", async ({ args }) => {
    const fetcher = vi.fn(() => { throw new Error("Network forbidden"); }); vi.stubGlobal("fetch", fetcher);
    const err = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const { main } = await import("../../../scripts/discover/capture-nasa.mjs");
    await main(args);
    expect(process.exitCode).toBe(1); expect(err).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
