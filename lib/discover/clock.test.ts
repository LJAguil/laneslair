import { afterEach, expect, it, vi } from "vitest";
import { discoverClockSnapshot, discoverServerClockSnapshot, subscribeDiscoverClock } from "./clock";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("catches up after foregrounding and removes listeners and timers when unmounted", () => {
  vi.useFakeTimers();
  const browser = new EventTarget(), page = new EventTarget();
  vi.stubGlobal("window", browser); vi.stubGlobal("document", page);
  const notify = vi.fn();
  const unsubscribe = subscribeDiscoverClock(notify);
  vi.advanceTimersByTime(1000);
  expect(notify).toHaveBeenCalledTimes(1);
  browser.dispatchEvent(new Event("focus"));
  browser.dispatchEvent(new Event("pageshow"));
  page.dispatchEvent(new Event("visibilitychange"));
  expect(notify).toHaveBeenCalledTimes(4);
  unsubscribe();
  vi.advanceTimersByTime(5000);
  browser.dispatchEvent(new Event("focus"));
  browser.dispatchEvent(new Event("pageshow"));
  page.dispatchEvent(new Event("visibilitychange"));
  expect(notify).toHaveBeenCalledTimes(4);
});

it("uses a stable second-precision snapshot and withholds server-time recommendations", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T18:00:00.123Z"));
  expect(discoverClockSnapshot()).toBe(Date.parse("2026-11-12T18:00:00Z"));
  expect(discoverServerClockSnapshot()).toBeNull();
});
