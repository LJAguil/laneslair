import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";
import { readStore, writeStore } from "./daily-store.mjs";
import { dailyAuthority, assertPilotStore } from "./daily-authority.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url)), output = path.join(root, "build/discover-daily");
const mode = process.argv[2];
if (process.argv.length !== 3 || !["prepare", "fetch", "sample", "--help"].includes(mode)) {
  process.stderr.write("Usage: node scripts/discover/daily-update.mjs prepare|fetch|sample|--help\n"); process.exitCode = 1;
} else if (mode === "--help") {
  process.stdout.write("sample: offline synthetic validation only. prepare/fetch: gated GitHub workflow only; persistent reservation must precede publisher requests.\n");
} else {
  try {
    const authority = mode === "sample" ? null : dailyAuthority(process.env);
    const modules = path.join(output, "modules"); await mkdir(modules, { recursive: true });
    await writeFile(path.join(modules, "package.json"), '{"type":"commonjs"}');
    for (const name of ["daily/policy", "daily/parsers", "daily/snapshot", "daily/transport", "feeds/nasa", "feeds/policy"]) {
      const target = path.join(modules, `${name}.js`); await mkdir(path.dirname(target), { recursive: true });
      const source = await readFile(path.join(root, "lib/discover", `${name}.ts`), "utf8");
      await writeFile(target, ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText);
    }
    const require = createRequire(import.meta.url);
    const { emptyDailySnapshot, bootstrapDailySnapshot, decodeDailySnapshot, reserveDaily } = require(path.join(modules, "daily/snapshot.js"));
    const { completeDaily } = require(path.join(modules, "daily/transport.js"));
    const statePath = path.join(output, "reservation.json");
    if (mode === "prepare") {
      const stored = await readStore(), now = Date.now();
      assertPilotStore(authority, stored.head);
      const snapshot = stored.text === null ? bootstrapDailySnapshot(now) : decodeDailySnapshot(stored.text, now);
      const reservation = reserveDaily(snapshot, now);
      const head = reservation.ids.length ? await writeStore(JSON.stringify(reservation.snapshot), stored.head) : stored.head;
      // Only written after the pre-request reservation is durable. No API token stored.
      await writeFile(statePath, JSON.stringify({ ...reservation, head }));
      process.stdout.write(`Reserved ${reservation.ids.length} daily source attempts.\n`);
    } else if (mode === "fetch") {
      const reservation = JSON.parse(await readFile(statePath, "utf8"));
      const stored = await readStore();
      if (!stored.text || stored.head !== reservation.head || stored.text !== JSON.stringify(reservation.snapshot)) throw Error("reservation-not-durable");
      if (reservation.ids.length) {
        const snapshot = await completeDaily({ snapshot: decodeDailySnapshot(stored.text, Date.now()), ids: reservation.ids, at: reservation.at, fetcher: fetch, now: Date.now });
        await writeStore(JSON.stringify(snapshot), reservation.head);
        for (const source of snapshot.sources) process.stdout.write(`${source.id}: ${source.error ?? "updated"}; ${source.items.length} metadata items\n`);
        if (snapshot.sources.some(source => source.error !== null)) process.exitCode = 1;
      } else process.stdout.write("Daily attempt limit reached; no publisher requests.\n");
    } else {
      const now = Date.parse("2026-11-20T12:00:00Z"), reservation = reserveDaily(emptyDailySnapshot(now), now);
      const snapshot = await completeDaily({ ...reservation, now: () => now, fetcher: async () => new Response("", { status: 503 }) });
      decodeDailySnapshot(JSON.stringify(snapshot), now);
      await writeFile(path.join(output, "sample.json"), JSON.stringify(snapshot, null, 2));
      process.stdout.write("Offline sample passed: failures retain clocks, consume reservations and do not fetch live data.\n");
    }
  } catch {
    // Do not print response bodies, request headers, environment values or tokens.
    process.stderr.write("Daily update stopped safely. No unvalidated snapshot was selected.\n"); process.exitCode = 1;
  }
}
