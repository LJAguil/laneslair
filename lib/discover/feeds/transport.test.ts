import { afterEach, describe, expect, it, vi } from "vitest";
import { FEED_NOW, fixtureFeed } from "./nasa.fixtures";
import { NASA_FEED_URL, NASA_LIMITS } from "./nasa";
import { fetchNasaFeed } from "./transport";
import type { NasaSnapshot } from "./types";

const now = () => FEED_NOW;
const xmlResponse = (body = fixtureFeed(), headers: HeadersInit = {}) => new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=UTF-8", ...headers } });
async function baseline() {
  const result = await fetchNasaFeed({ fetcher: async () => xmlResponse(undefined, { ETag: 'W/"synthetic"', "Last-Modified": "Thu, 12 Nov 2026 05:05:00 GMT" }), now });
  if (result.status === "failed") throw new Error(result.reason);
  return result.snapshot;
}
afterEach(() => { vi.useRealTimers(); });

describe("NASA transport using mocked requests only", () => {
  it("makes one fixed credential-free request and returns metadata-only candidates", async () => {
    const fetcher = vi.fn(async () => xmlResponse());
    const result = await fetchNasaFeed({ fetcher, now });
    expect(result.status).toBe("updated");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]).toEqual([NASA_FEED_URL, expect.objectContaining({ credentials: "omit", redirect: "manual", referrerPolicy: "no-referrer", cache: "no-store", method: "GET" })]);
    if (result.status === "failed") return;
    expect(result.snapshot.candidates).toHaveLength(1);
    expect(result.snapshot.bodyFetchedAt).toBe(new Date(FEED_NOW).toISOString());
    expect(Object.isFrozen(result.snapshot)).toBe(true);
    expect(Object.isFrozen(result.snapshot.candidates[0].sourceItemIds)).toBe(true);
  });

  it("revalidates an immutable in-memory baseline without renewing its body-fetch time", async () => {
    const previous = await baseline();
    const fetcher = vi.fn(async () => new Response(null, { status: 304 }));
    const result = await fetchNasaFeed({ fetcher, now: () => FEED_NOW + 3_600_000, previous });
    expect(result.status).toBe("not-modified");
    const headers = new Headers((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].headers);
    expect(headers.get("If-None-Match")).toBe('W/"synthetic"');
    if (result.status === "failed") return;
    expect(result.snapshot.bodyFetchedAt).toBe(previous.bodyFetchedAt);
    expect(result.snapshot.representationCheckedAt).toBe(new Date(FEED_NOW + 3_600_000).toISOString());
    expect(previous.representationCheckedAt).toBe(new Date(FEED_NOW).toISOString());
  });

  it("uses Last-Modified when no ETag is available, and sanitizes malformed validators", async () => {
    const first = await fetchNasaFeed({ fetcher: async () => xmlResponse(undefined, { ETag: "bad etag", "Last-Modified": "Thu, 12 Nov 2026 05:05:00 GMT" }), now });
    if (first.status === "failed") throw new Error(first.reason);
    expect(first.snapshot.etag).toBeNull();
    const fetcher = vi.fn(async () => new Response(null, { status: 304 }));
    await fetchNasaFeed({ fetcher, now, previous: first.snapshot });
    const headers = new Headers((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].headers);
    expect(headers.get("If-Modified-Since")).toBe("Thu, 12 Nov 2026 05:05:00 GMT");
  });

  it("rejects 304 without a baseline and untrusted/deserialized baseline objects", async () => {
    expect(await fetchNasaFeed({ fetcher: async () => new Response(null, { status: 304 }), now })).toEqual({ status: "failed", reason: "not-modified-without-baseline" });
    const previous = await baseline();
    const fetcher = vi.fn();
    expect(await fetchNasaFeed({ fetcher, now, previous: JSON.parse(JSON.stringify(previous)) as NasaSnapshot })).toEqual({ status: "failed", reason: "invalid-baseline" });
    expect(await fetchNasaFeed({ fetcher, now: () => FEED_NOW - 1000, previous })).toEqual({ status: "failed", reason: "invalid-baseline" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not freshen a baseline from an unsolicited 304 with no sent validator", async () => {
    const initial = await fetchNasaFeed({ fetcher: async () => xmlResponse(), now });
    if (initial.status === "failed") throw new Error(initial.reason);
    expect(await fetchNasaFeed({ fetcher: async () => new Response(null, { status: 304 }), now, previous: initial.snapshot })).toEqual({ status: "failed", reason: "not-modified-without-validator" });
  });

  it("rejects an already-followed response and an absent body", async () => {
    const followed = xmlResponse();
    Object.defineProperty(followed, "redirected", { value: true });
    expect(await fetchNasaFeed({ fetcher: async () => followed, now })).toEqual({ status: "failed", reason: "redirect" });
    expect(await fetchNasaFeed({ fetcher: async () => new Response(null, { headers: { "Content-Type": "application/rss+xml" } }), now })).toEqual({ status: "failed", reason: "missing-body" });
  });

  it.each([301, 302, 307, 308])("does not follow HTTP %i redirects", async status => {
    const fetcher = vi.fn(async () => new Response(null, { status, headers: { Location: "https://example.invalid/elsewhere" } }));
    expect(await fetchNasaFeed({ fetcher, now })).toEqual({ status: "failed", reason: "redirect" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([429, 500, 503])("reports HTTP %i without retries or renewed source checks", async status => {
    const previous = await baseline();
    const before = JSON.stringify(previous);
    const fetcher = vi.fn(async () => new Response("not XML", { status, headers: { "Retry-After": "120" } }));
    expect(await fetchNasaFeed({ fetcher, now, previous })).toEqual({ status: "failed", reason: "http-error", httpStatus: status, retryAfterAt: new Date(FEED_NOW + 120_000).toISOString() });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(previous)).toBe(before);
  });

  it.each(["text/html", "application/json", "application/rss+xml; charset=iso-8859-1"])("rejects content type %s", contentType => {
    return expect(fetchNasaFeed({ fetcher: async () => new Response(fixtureFeed(), { headers: { "Content-Type": contentType } }), now })).resolves.toEqual({ status: "failed", reason: "unsupported-content-type" });
  });

  it("limits declared and streamed body sizes, including decompressed/unknown-length streams", async () => {
    expect(await fetchNasaFeed({ fetcher: async () => xmlResponse("small", { "Content-Length": String(NASA_LIMITS.bytes + 1) }), now })).toEqual({ status: "failed", reason: "too-large" });
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(NASA_LIMITS.bytes)); controller.enqueue(new Uint8Array(1)); }, cancel });
    const result = await fetchNasaFeed({ fetcher: async () => new Response(stream, { headers: { "Content-Type": "application/rss+xml" } }), now });
    expect(result).toEqual({ status: "failed", reason: "too-large" });
    expect(cancel).toHaveBeenCalled();
  });

  it("rejects invalid UTF-8 and malformed XML without altering the last good baseline", async () => {
    expect(await fetchNasaFeed({ fetcher: async () => new Response(new Uint8Array([0xc3, 0x28]), { headers: { "Content-Type": "application/rss+xml" } }), now })).toEqual({ status: "failed", reason: "invalid-encoding" });
    const previous = await baseline();
    const before = JSON.stringify(previous);
    expect(await fetchNasaFeed({ fetcher: async () => xmlResponse("<rss>"), now, previous })).toEqual({ status: "failed", reason: "malformed-xml" });
    expect(JSON.stringify(previous)).toBe(before);
  });

  it("decodes UTF-8 characters split across network chunks", async () => {
    const bytes = new TextEncoder().encode(fixtureFeed().replace("Invented rocket", "Invented 🚀 rocket"));
    const stream = new ReadableStream<Uint8Array>({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } });
    const result = await fetchNasaFeed({ fetcher: async () => new Response(stream, { headers: { "Content-Type": "application/rss+xml" } }), now });
    if (result.status === "failed") throw new Error(result.reason);
    expect(result.snapshot.candidates[0].title).toContain("🚀");
  });

  it("times out a fetch that ignores abort and cancels a response arriving late", async () => {
    vi.useFakeTimers();
    let resolve!: (response: Response) => void;
    let signal: AbortSignal | undefined;
    const pending = fetchNasaFeed({ fetcher: (_url, init) => { signal = init.signal as AbortSignal; return new Promise(done => { resolve = done; }); }, now });
    await vi.advanceTimersByTimeAsync(NASA_LIMITS.deadlineMs);
    expect(await pending).toEqual({ status: "failed", reason: "timeout" });
    expect(signal?.aborted).toBe(true);
    const cancel = vi.fn();
    resolve(new Response(new ReadableStream({ cancel }), { headers: { "Content-Type": "application/rss+xml" } }));
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalled();
  });

  it("times out a stalled body after headers arrive", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const pending = fetchNasaFeed({ fetcher: async () => new Response(new ReadableStream({ cancel }), { headers: { "Content-Type": "application/rss+xml" } }), now });
    await vi.advanceTimersByTimeAsync(NASA_LIMITS.deadlineMs);
    expect(await pending).toEqual({ status: "failed", reason: "timeout" });
    expect(cancel).toHaveBeenCalled();
  });

  it("sanitizes network failures and rejects invalid or rolled-back evaluation clocks", async () => {
    expect(await fetchNasaFeed({ fetcher: async () => { throw new Error("Untrusted transport detail"); }, now })).toEqual({ status: "failed", reason: "network-error" });
    expect(await fetchNasaFeed({ fetcher: vi.fn(), now: () => NaN })).toEqual({ status: "failed", reason: "invalid-clock" });
    const clock = vi.fn().mockReturnValueOnce(FEED_NOW).mockReturnValue(FEED_NOW - 1);
    expect(await fetchNasaFeed({ fetcher: async () => xmlResponse(), now: clock })).toEqual({ status: "failed", reason: "invalid-clock" });
  });
});
