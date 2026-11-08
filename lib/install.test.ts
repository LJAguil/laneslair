import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import manifest from "@/app/manifest";

vi.mock("@/lib/supabase/proxy", () => ({ updateSession: vi.fn() }));
import { config, proxy } from "@/proxy";
import { updateSession } from "@/lib/supabase/proxy";

describe("installation assets and route protection", () => {
  it("bypasses session redirects only for the exact bearer-protected dispatch route",async()=>{
    vi.mocked(updateSession).mockClear();
    await proxy(new NextRequest("https://lair.example/api/push/dispatch"));expect(updateSession).not.toHaveBeenCalled();
    await proxy(new NextRequest("https://lair.example/api/push/dispatch/private"));expect(updateSession).toHaveBeenCalledOnce();
  });
  it("allows the static manifest and icons before login while guarding app routes", () => {
    const match = (url: string) => unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });
    for (const path of ["/sw.js", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"]) expect(match(path), path).toBe(false);
    for (const path of ["/", "/inbox", "/tasks", "/projects", "/journal", "/journal?date=2026-11-07", "/statistics", "/play", "/play/rune-lock", "/play/chess", "/play/echoes", "/sw.js/private", "/manifest.webmanifest/private"]) expect(match(path), path).toBe(true);
  });

  it("uses real full-size PNG assets and a standalone same-origin app scope", () => {
    const m = manifest();
    expect(m).toMatchObject({ display: "standalone", start_url: "/", scope: "/", id: "/" });
    for (const icon of m.icons ?? []) {
      const bytes = readFileSync(new URL(`../public${icon.src}`, import.meta.url));
      expect(bytes.subarray(1, 4).toString()).toBe("PNG");
      expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes);
    }
    const apple = readFileSync(new URL("../public/apple-touch-icon.png", import.meta.url));
    expect([apple.readUInt32BE(16), apple.readUInt32BE(20)]).toEqual([180, 180]);
  });
});
