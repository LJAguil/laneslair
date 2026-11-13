// Offline only. Does not import the transport, call fetch, read env files, or publish.
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
let inputPath, at, sample = false;
function usage() { throw new Error("Usage: npm run discover:dry-run -- --sample OR --xml <local.xml> [--now <ISO instant with zone>]"); }
try {
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--sample" && !inputPath && !sample) sample = true;
    else if (args[index] === "--xml" && !inputPath && !sample && args[index + 1] && !args[index + 1].startsWith("--")) inputPath = path.resolve(args[++index]);
    else if (args[index] === "--now" && !at && args[index + 1] && !args[index + 1].startsWith("--")) at = args[++index];
    else usage();
  }
  if (!sample && !inputPath) usage();
  if (at) {
    const match = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(at);
    const day = match ? new Date(`${match[1]}T00:00:00Z`) : new Date(NaN);
    if (!match || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== match[1] || !Number.isFinite(Date.parse(at))) usage();
  }
  const now = at ? Date.parse(at) : sample ? Date.parse("2026-11-12T18:00:00Z") : Date.now();
  if (sample) inputPath = fileURLToPath(new URL("./sample-nasa.xml", import.meta.url));
  // Use the already-declared TypeScript development dependency to run the exact
  // source parser. Generated CommonJS modules stay under the ignored build folder.
  // This avoids a new TS runner or reliance on undocumented Next/Vite internals.
  const outputDir = path.join(root, "build", "discover-offline-importer");
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "package.json"), '{"type":"commonjs"}\n');
  for (const name of ["policy", "nasa"]) {
    const source = await readFile(path.join(root, `lib/discover/feeds/${name}.ts`), "utf8");
    const compiled = ts.transpileModule(source, { fileName: `${name}.ts`, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
    await writeFile(path.join(outputDir, `${name}.js`), compiled.outputText);
  }
  const { parseNasaFeed, NASA_LIMITS } = createRequire(import.meta.url)(path.join(outputDir, "nasa.js"));
  const chunks = [];
  let bytes = 0;
  for await (const chunk of createReadStream(inputPath, { highWaterMark: 8192 })) {
    bytes += chunk.byteLength;
    if (bytes > NASA_LIMITS.bytes) throw new Error("too-large");
    chunks.push(chunk);
  }
  const xml = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  const result = parseNasaFeed(xml, now);
  // Counts/rejection codes only; no article content, local filename or candidate
  // metadata is automatically written into the app's real catalog.
  process.stdout.write(JSON.stringify({ offline: true, synthetic: sample, evaluatedAt: new Date(now).toISOString(), inputCount: result.inputCount, candidateCount: result.candidates.length, duplicateCount: result.duplicateCount, omittedCount: result.omittedCount, rejected: result.rejected }, null, 2) + "\n");
} catch (error) {
  const message = error instanceof Error && (error.message.startsWith("Usage:") || /^[a-z]+(?:-[a-z]+)*$/.test(error.message)) ? error.message : "Could not import the local XML file. No catalog changes were made.";
  process.stderr.write(message + "\n");
  process.exitCode = 1;
}
