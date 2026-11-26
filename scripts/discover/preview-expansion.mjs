// Parse already-saved public captures offline. No requests, evidence renewal or app selection.
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const mode = process.argv[2];
if (process.argv.length !== 3 || !["--help", "--local-captures"].includes(mode)) {
  process.stderr.write("Usage: node scripts/discover/preview-expansion.mjs --local-captures|--help\n"); process.exitCode = 1;
} else if (mode === "--help") {
  process.stdout.write("Offline preview of saved West Monroe / Global Voices captures. Counts only; no network or catalog updates.\n");
} else {
  const root = fileURLToPath(new URL("../../", import.meta.url)), output = path.join(root, "build/discover-expansion-preview");
  try {
    const modules = path.join(output, "modules"); await mkdir(modules, { recursive: true });
    await writeFile(path.join(modules, "package.json"), '{"type":"commonjs"}');
    for (const name of ["expansion/parsers", "daily/parsers", "daily/policy", "feeds/nasa", "feeds/policy"]) {
      const target = path.join(modules, `${name}.js`); await mkdir(path.dirname(target), { recursive: true });
      const source = await readFile(path.join(root, "lib/discover", `${name}.ts`), "utf8");
      await writeFile(target, ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText);
    }
    const require = createRequire(import.meta.url), { parseGlobalVoices, parseWestMonroe } = require(path.join(modules, "expansion/parsers.js"));
    const saved = async name => {
      const file = path.join(root, "build/discover-expansion-research", name), info = await stat(file);
      if (info.size > 2 * 1024 * 1024) throw Error("oversized-capture");
      return { body: await readFile(file, "utf8"), savedAt: info.mtime.toISOString() };
    };
    const now = Date.now(), city = await saved("west-monroe-25.ics"), news = await saved("global-voices.xml");
    const calendar = parseWestMonroe(city.body, now), articles = parseGlobalVoices(news.body, now);
    const report = { mode: "offline-only", evaluatedAt: new Date(now).toISOString(), networkRequests: 0, defaultCatalogChanged: false,
      city: { savedAt: city.savedAt, eligibleTimedEvents: calendar.items.length, entriesNeedingReview: calendar.needsReview },
      news: { savedAt: news.savedAt, recentMetadataItems: articles.length, withAuthor: articles.filter(item => item.author).length },
      note: "Capture save times are not source or editorial checks. Adapters remain disconnected from live ingestion." };
    await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } catch {
    process.stderr.write("Offline expansion preview stopped; no catalog changes or network requests. Check saved captures and parser compatibility.\n"); process.exitCode = 1;
  }
}
