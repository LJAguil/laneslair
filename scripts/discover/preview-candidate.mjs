// Local public-content candidate only. No env, auth, app store, acquisition or publication.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";
import { createServer } from "vite";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  process.stdout.write("Usage: npm run discover:preview (localhost:4323, reviewed local metadata only)\n");
} else if (args.length) {
  process.stderr.write("Unknown preview arguments. No catalog changes made.\n"); process.exitCode = 1;
} else {
  const preview = path.join(root, "build/discover-candidate-preview"), output = path.join(preview, "server-modules");
  await mkdir(output, { recursive: true }); await writeFile(path.join(output, "package.json"), '{"type":"commonjs"}');
  for (const name of ["types", "curated", "candidate-news", "candidate", "sources", "catalog", "feed-availability", "feeds/policy", "feeds/nasa", "feeds/snapshot", "feeds/transport", "feeds/review-bundle", "feeds/to-news", "feeds/bundled-catalog", "feeds/review-staging"]) {
    const target = path.join(output, `${name}.js`); await mkdir(path.dirname(target), { recursive: true });
    const source = await readFile(path.join(root, "lib/discover", `${name}.ts`), "utf8");
    await writeFile(target, ts.transpileModule(source, { fileName: `${name}.ts`, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText);
  }
  const require = createRequire(import.meta.url);
  const { loadBundledCatalog } = require(path.join(output, "feeds/bundled-catalog.js"));
  const { boundedFile } = require(path.join(output, "feeds/review-staging.js"));
  const { REVIEW_BUNDLE_BYTES } = require(path.join(output, "feeds/review-bundle.js"));
  const { candidateCatalog, candidateCurationNote } = require(path.join(output, "candidate.js"));
  const { discoverSources } = require(path.join(output, "sources.js"));
  // Exact real capture reviewed November 13. Never select the newest staging file,
  // compute a substitute digest, or fetch a replacement if it is absent/invalid.
  const expectedDigest = "94bd1b2083a41695fe9b33f7cd4779647d13c0979147fb4acf31bd1c02f06bfb";
  let selection = null;
  try { selection = { expectedDigest, bytes: await boundedFile(path.join(root, "build/discover/capture/manual/artifacts", `${expectedDigest}.json`), REVIEW_BUNDLE_BYTES) }; }
  catch { /* Existing curated candidate remains useful without the supplemental file. */ }
  const catalog = loadBundledCatalog({ curated: candidateCatalog, sources: discoverSources, selection, now: Date.now() });
  await writeFile(path.join(preview, "catalog.json"), JSON.stringify({ ...catalog, sources: discoverSources, curationNote: candidateCurationNote }));
  const compiler = await compile(await readFile(path.join(root, "app/globals.css"), "utf8"), { base: path.join(root, "app"), onDependency() {} });
  const scanner = new Scanner({ sources: [{ base: path.join(root, "components"), pattern: "**/*.tsx", negated: false }] });
  await writeFile(path.join(preview, "style.css"), compiler.build(scanner.scan()));
  await writeFile(path.join(preview, "index.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Discover local candidate</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>');
  await writeFile(path.join(preview, "main.jsx"), `import React,{useSyncExternalStore} from 'react';import{createRoot}from'react-dom/client';import{DiscoverScreen}from'@/components/discover/discover-view';import{subscribeDiscoverClock,discoverClockSnapshot,discoverServerClockSnapshot}from'@/lib/discover/clock';import catalog from './catalog.json';function Preview(){const now=useSyncExternalStore(subscribeDiscoverClock,discoverClockSnapshot,discoverServerClockSnapshot);return <main className="p-4 sm:p-8"><p className="mx-auto mb-4 max-w-3xl text-sm text-warning">Local candidate preview · not published</p><DiscoverScreen {...catalog} now={now}/></main>}createRoot(document.getElementById('root')).render(<Preview/>);`);
  const server = await createServer({ configFile: false, envDir: false, root: preview, cacheDir: path.join(preview, ".vite-candidate"), resolve: { alias: { "@": root } }, server: { host: "127.0.0.1", port: 4323, strictPort: true, fs: { allow: [root] } } });
  await server.listen();
  process.stdout.write(`Discover candidate: http://127.0.0.1:4323 (feed ${catalog.feed.status}; no capture or publication)\n`);
  let closing = false;
  const close = async () => { if (closing) return; closing = true; await server.close(); process.exit(0); };
  process.on("SIGINT", close); process.on("SIGTERM", close);
}
