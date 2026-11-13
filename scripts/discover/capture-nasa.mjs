// Manual fixed-source acquisition only. No fetch on import/help/status/sample.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));
const usage = 'Usage: discover:capture --help | sample | status --manual | observe --manual --single-operator | capture --manual --single-operator | reconcile --manual --single-operator --expected-state <sha256> --revision <integer> --pending <capture-id>';
export async function main(args = process.argv.slice(2)) {
  try {
    if (args.length === 1 && args[0] === '--help') { process.stdout.write(usage + '\n'); return; }
    const [mode, ...flags] = args;
    let recovery;
    if (mode === 'reconcile') {
      const values = new Map();
      for (let i = 0; i < flags.length; i++) {
        const key = flags[i];
        if (values.has(key) || !['--manual','--single-operator','--expected-state','--revision','--pending'].includes(key)) throw new Error(usage);
        if (['--manual','--single-operator'].includes(key)) values.set(key,true);
        else { if (!flags[i+1] || flags[i+1].startsWith('--')) throw new Error(usage); values.set(key,flags[++i]); }
      }
      if(values.size!==5 || !/^[a-f0-9]{64}$/.test(values.get('--expected-state')) || !/^[1-9]\d*$/.test(values.get('--revision')) || !Number.isSafeInteger(Number(values.get('--revision'))) || !/^capture-[1-9]\d*$/.test(values.get('--pending'))) throw new Error(usage);
      recovery={expectedStateDigest:values.get('--expected-state'),expectedRevision:Number(values.get('--revision')),expectedPending:values.get('--pending')};
    }
    const valid = mode === 'reconcile' ? recovery !== undefined : mode === 'sample' ? flags.length === 0
      : mode === 'status' ? flags.length === 1 && flags[0] === '--manual'
      : ['observe', 'capture'].includes(mode) && flags.length === 2 && new Set(flags).size === 2 && flags.includes('--manual') && flags.includes('--single-operator');
    if (!valid) throw new Error(usage);
    const compiledDirectory = path.join(root, 'build/discover-offline-capture');
    await mkdir(compiledDirectory, {recursive:true});
    await writeFile(path.join(compiledDirectory,'package.json'), '{"type":"commonjs"}\n');
    for (const name of ['policy','nasa','snapshot','transport','review-bundle','review-staging','capture','capture-store','capture-recovery','nasa.fixtures']) {
      const source = await readFile(path.join(root, `lib/discover/feeds/${name}.ts`), 'utf8');
      const compiled = ts.transpileModule(source, { fileName: `${name}.ts`, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
      await writeFile(path.join(compiledDirectory, `${name}.js`), compiled.outputText);
    }
    const require = createRequire(import.meta.url);
    const {localCaptureStore} = require(path.join(compiledDirectory,'capture-store.js'));
    const {observeCaptureHistory, captureNasaOnce, decodeCaptureState, CAPTURE_DAY} = require(path.join(compiledDirectory,'capture.js'));
    const {validateReviewBundle,reviewDigest} = require(path.join(compiledDirectory,'review-bundle.js'));
    const kind = mode === 'sample' ? 'synthetic' : 'manual';
    const store = await localCaptureStore(root, kind);
    if (mode === 'status') {
      const bytes = await store.withLock(io => io.readState());
      const state = bytes === null ? null : decodeCaptureState(bytes, Date.now());
      process.stdout.write(JSON.stringify({manualOnly:true,status:state===null?'missing':'present',stateDigest:bytes===null?null:reviewDigest(bytes),state},null,2)+'\n'); return;
    }
    if (mode === 'reconcile') {
      const {reconcilePendingCapture}=require(path.join(compiledDirectory,'capture-recovery.js'));
      const result=await reconcilePendingCapture({store,inputKind:'manual',singleOperator:true,...recovery,now:Date.now()});
      process.stdout.write(JSON.stringify({manualOnly:true,networkRequests:0,result},null,2)+'\n');
      if(result.status!=='reconciled') process.exitCode=1;
      return;
    }
    if (mode === 'observe') {
      const state = await observeCaptureHistory(store, 'manual', Date.now());
      process.stdout.write(JSON.stringify({manualOnly:true,status:'observing',initializedAt:state.initializedAt,earliestCaptureAt:new Date(Date.parse(state.initializedAt)+CAPTURE_DAY).toISOString(),recordedProbes:state.attempts.length,note:'Requires single-operator control with no other feed requests for the full observation period. No request made.'},null,2)+'\n'); return;
    }
    let now = () => Date.now();
    // This closure is never invoked except by an admitted, explicit capture mode.
    let fetcher = (url, init) => globalThis.fetch(url, init);
    if (mode === 'sample') {
      const {FEED_NOW,fixtureFeed} = require(path.join(compiledDirectory,'nasa.fixtures.js'));
      now = () => FEED_NOW;
      fetcher = async () => new Response(fixtureFeed(), {headers:{'content-type':'application/rss+xml',etag:'"synthetic-capture"'}});
      const current = await store.withLock(io => io.readState());
      if (current === null) await observeCaptureHistory(store,'synthetic',FEED_NOW-CAPTURE_DAY);
    }
    const result = await captureNasaOnce({store,inputKind:kind,singleOperator:true,now,fetcher});
    let review;
    if (result.status === 'captured') {
      const bytes = await store.withLock(io => io.readArtifact(result.bundleDigest));
      const bundle = validateReviewBundle(bytes,result.bundleDigest,now());
      review = {bundlePath:path.join(store.directory,'artifacts',`${bundle.digest}.json`),digest:bundle.digest,inputKind:bundle.inputKind,preparedAt:bundle.preparedAt,bodyFetchedAt:bundle.snapshot.bodyFetchedAt,feedCheckedAt:bundle.snapshot.representationCheckedAt,candidates:bundle.snapshot.candidates,rejected:bundle.snapshot.rejected,inputCount:bundle.snapshot.inputCount,duplicateCount:bundle.snapshot.duplicateCount,omittedCount:bundle.snapshot.omittedCount};
    }
    process.stdout.write(JSON.stringify({manualOnly:true,synthetic:mode==='sample',result,review},null,2)+'\n');
    if(result.status!=='captured') process.exitCode=1;
  } catch(error) {
    const message=error instanceof Error && (error.message===usage || /^[a-z]+(?:-[a-z]+)*$/.test(error.message))?error.message:'capture-command-failed';
    process.stderr.write(message+'\n'); process.exitCode=1;
  }
}
// Importing the command is inert, including no compilation, storage or network work.
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();
