import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { captureNasaOnce, observeCaptureHistory, decodeCaptureState, CAPTURE_DAY, CAPTURE_GAP, type CaptureIO, type CaptureStore, type CaptureKind } from "./capture";
import { reconcilePendingCapture } from "./capture-recovery";
import { localCaptureStore } from "./capture-store";
import { reviewDigest } from "./review-bundle";
import { FEED_NOW, fixtureFeed } from "./nasa.fixtures";

function memory() {
  let state: string | null = null;
  const artifacts = new Map<string,string>();
  const io: CaptureIO = {
    assertLock: vi.fn(async () => {}), readState: vi.fn(async () => state),
    commitState: vi.fn(async (bytes, expected) => { if(state!==expected) throw new Error("conflict"); state=bytes; }),
    readArtifact: vi.fn(async digest => { const value=artifacts.get(digest); if(value===undefined) throw new Error("missing"); return value; }),
    writeArtifact: vi.fn(async (digest, bytes) => { artifacts.set(digest,bytes); }),
  };
  const store: CaptureStore = { withLock: work => work(io) };
  return {store,io,artifacts,get state(){return state;},set state(value){state=value;}};
}
const fetcher = () => new Response(fixtureFeed(),{headers:{'content-type':'application/rss+xml',etag:'"invented-recovery"'}});
async function interrupted(withLastGood=false) {
  const stage=memory(); await observeCaptureHistory(stage.store,"synthetic",FEED_NOW-CAPTURE_DAY);
  if(withLastGood) await captureNasaOnce({store:stage.store,inputKind:"synthetic",singleOperator:true,now:()=>FEED_NOW,fetcher:async()=>fetcher()});
  vi.mocked(stage.io.writeArtifact).mockRejectedValueOnce(new Error("simulated interruption"));
  const at=FEED_NOW+(withLastGood?CAPTURE_GAP:0);
  const result=await captureNasaOnce({store:stage.store,inputKind:"synthetic",singleOperator:true,now:()=>at,fetcher:async()=>fetcher()});
  expect(result.status).toBe("blocked"); return stage;
}
function operands(stage: ReturnType<typeof memory>, now=FEED_NOW+CAPTURE_DAY) {
  const state=JSON.parse(stage.state!);
  return {store:stage.store,inputKind:"synthetic" as CaptureKind,singleOperator:true,expectedStateDigest:reviewDigest(stage.state!),expectedRevision:state.revision,expectedPending:state.pending,now};
}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe("explicit pending-capture reconciliation without network",()=>{
  it.each([false,true])("preserves every spent attempt and last-good reference (prior=%s)",async prior=>{
    const stage=await interrupted(prior), before=JSON.parse(stage.state!), files=[...stage.artifacts.entries()];
    vi.mocked(stage.io.writeArtifact).mockClear();
    const forbidden=vi.fn(()=>{throw new Error("Network forbidden");}); vi.stubGlobal("fetch",forbidden);
    const result=await reconcilePendingCapture(operands(stage));
    expect(result).toMatchObject({status:"reconciled",attemptId:before.pending,revision:before.revision+1});
    const after=decodeCaptureState(stage.state!,FEED_NOW+CAPTURE_DAY);
    expect(after).toMatchObject({attempts:before.attempts,lastGood:before.lastGood,pending:null,outcome:"interrupted",initializedAt:before.initializedAt});
    expect(after.nextAllowedAt).toBe(new Date(FEED_NOW+CAPTURE_DAY+CAPTURE_GAP).toISOString());
    expect([...stage.artifacts.entries()]).toEqual(files); expect(stage.io.writeArtifact).not.toHaveBeenCalled();
    expect(forbidden).not.toHaveBeenCalled();
  });
  it("does not adopt newer orphan metadata while preserving selected provenance",async()=>{
    const stage=await interrupted(true), before=JSON.parse(stage.state!);
    stage.artifacts.set("0".repeat(64),"unselected orphan");
    vi.mocked(stage.io.readArtifact).mockClear();
    expect((await reconcilePendingCapture(operands(stage))).status).toBe("reconciled");
    expect(JSON.parse(stage.state!).lastGood).toEqual(before.lastGood);
    expect(vi.mocked(stage.io.readArtifact).mock.calls.map(call=>call[0])).toEqual([before.lastGood.snapshotDigest,before.lastGood.bundleDigest]);
    expect(stage.artifacts.get("0".repeat(64))).toBe("unselected orphan");
  });
  it.each(["digest","revision","attempt"])("rejects stale expected %s without writes",async field=>{
    const stage=await interrupted(), expected=operands(stage), before=stage.state;
    vi.mocked(stage.io.commitState).mockClear();
    if(field==="digest") expected.expectedStateDigest="0".repeat(64);
    if(field==="revision") expected.expectedRevision++;
    if(field==="attempt") expected.expectedPending="capture-99";
    expect(await reconcilePendingCapture(expected)).toMatchObject({status:"blocked",reason:"recovery-state-conflict"});
    expect(stage.state).toBe(before); expect(stage.io.commitState).not.toHaveBeenCalled();
  });
  it.each(["missing","corrupt","kind","clock","operator"])("refuses %s state/authority",async condition=>{
    const stage=await interrupted(), expected=operands(stage);
    if(condition==="missing") stage.state=null;
    if(condition==="corrupt"){stage.state="{";expected.expectedStateDigest=reviewDigest(stage.state);}
    if(condition==="kind") expected.inputKind="manual";
    if(condition==="clock") expected.now=FEED_NOW-1;
    if(condition==="operator") expected.singleOperator=false;
    vi.mocked(stage.io.commitState).mockClear();
    expect((await reconcilePendingCapture(expected)).status).toBe("blocked");
    expect(stage.io.commitState).not.toHaveBeenCalled();
  });
  it("rejects malformed recovery operands before acquiring a lock",async()=>{
    const stage=await interrupted(), expected=operands(stage), withLock=vi.spyOn(stage.store,"withLock");
    for(const patch of [{expectedRevision:0},{expectedRevision:1.5},{expectedStateDigest:"../state"},{expectedPending:"other"}])
      expect(await reconcilePendingCapture({...expected,...patch})).toMatchObject({reason:"invalid-recovery-operands"});
    expect(withLock).not.toHaveBeenCalled();
  });
  it("refuses a completed attempt and cannot use reconciliation to refund its budget",async()=>{
    const stage=await interrupted(), old=operands(stage); await reconcilePendingCapture(old);
    expect(await reconcilePendingCapture(old)).toMatchObject({reason:"recovery-state-conflict"});
    const current=operands(stage); current.expectedPending=old.expectedPending;
    expect(await reconcilePendingCapture(current)).toMatchObject({reason:"no-pending-capture"});
    const forbidden=vi.fn(async()=>fetcher());
    expect(await captureNasaOnce({store:stage.store,inputKind:"synthetic",singleOperator:true,now:()=>FEED_NOW+CAPTURE_DAY,fetcher:forbidden})).toMatchObject({reason:"capture-backoff"});
    expect(forbidden).not.toHaveBeenCalled();
  });
  it("leaves an already committed successful capture untouched after an uncertain caller outcome",async()=>{
    const stage=memory(); await observeCaptureHistory(stage.store,"synthetic",FEED_NOW-CAPTURE_DAY);
    await captureNasaOnce({store:stage.store,inputKind:"synthetic",singleOperator:true,now:()=>FEED_NOW,fetcher:async()=>fetcher()});
    const before=stage.state!, state=JSON.parse(before);
    const result=await reconcilePendingCapture({store:stage.store,inputKind:"synthetic",singleOperator:true,expectedStateDigest:reviewDigest(before),expectedRevision:state.revision,expectedPending:state.lastGood.attemptId,now:FEED_NOW+1000});
    expect(result).toMatchObject({reason:"no-pending-capture"}); expect(stage.state).toBe(before);
  });
  it("preserves longer publisher backoff",async()=>{
    const stage=await interrupted(), state=JSON.parse(stage.state!);
    state.nextAllowedAt=new Date(FEED_NOW+3*CAPTURE_DAY).toISOString(); stage.state=JSON.stringify(state);
    expect((await reconcilePendingCapture(operands(stage))).status).toBe("reconciled");
    expect(JSON.parse(stage.state!).nextAllowedAt).toBe(state.nextAllowedAt);
  });
  it.each(["snapshot","review"])("refuses corrupt last-good %s without clearing pending",async which=>{
    const stage=await interrupted(true), before=stage.state!, good=JSON.parse(before).lastGood;
    stage.artifacts.set(which==="snapshot"?good.snapshotDigest:good.bundleDigest,"partial");
    expect((await reconcilePendingCapture(operands(stage))).status).toBe("blocked"); expect(stage.state).toBe(before);
  });
  it.each(["before","after"])("handles completion write ambiguity %s commit without retrying",async when=>{
    const stage=await interrupted(), expected=operands(stage), original=stage.state;
    vi.mocked(stage.io.commitState).mockImplementationOnce(async bytes=>{if(when==="after")stage.state=bytes;throw new Error("ambiguous");});
    expect((await reconcilePendingCapture(expected)).status).toBe("blocked");
    expect(JSON.parse(stage.state!).attempts).toEqual(JSON.parse(original!).attempts);
    expect(JSON.parse(stage.state!).pending).toBe(when==="before"?expected.expectedPending:null);
    if(when==="after")expect(await reconcilePendingCapture(expected)).toMatchObject({reason:"recovery-state-conflict"});
  });
  it("reports readback uncertainty after a commit without repeating it",async()=>{
    const stage=await interrupted(), expected=operands(stage);
    vi.mocked(stage.io.readState).mockResolvedValueOnce(stage.state).mockResolvedValueOnce("partial");
    vi.mocked(stage.io.commitState).mockClear();
    expect(await reconcilePendingCapture(expected)).toMatchObject({reason:"capture-write-uncertain"});
    expect(stage.io.commitState).toHaveBeenCalledTimes(1); expect(JSON.parse(stage.state!).pending).toBeNull();
  });
  it("refuses lock loss without changing pending state",async()=>{
    const stage=await interrupted(), before=stage.state;
    vi.mocked(stage.io.assertLock).mockRejectedValueOnce(new Error("capture-lock-lost"));
    expect(await reconcilePendingCapture(operands(stage))).toMatchObject({reason:"capture-lock-lost"});
    expect(stage.state).toBe(before);
  });
});

const roots:string[]=[];
async function temporaryWorkspace(){const root=await mkdtemp(path.join(tmpdir(),"discover-recovery-test-"));roots.push(root);return root;}
afterEach(async()=>{for(const root of roots.splice(0)){
  if(path.dirname(path.resolve(root))!==path.resolve(tmpdir())||!path.basename(root).startsWith("discover-recovery-test-"))throw new Error("unsafe-test-cleanup");
  await rm(root,{recursive:true,force:true});
}});
describe("filesystem recovery and restart",()=>{
  it("reconciles preserved artifacts through a fresh module/adapter, then reloads the committed state",async()=>{
    const stage=await interrupted(true), root=await temporaryWorkspace(), disk=await localCaptureStore(root,"synthetic");
    await disk.withLock(async io=>{for(const [digest,bytes] of stage.artifacts)await io.writeArtifact(digest,bytes);await io.commitState(stage.state!,null);});
    vi.resetModules(); const {reconcilePendingCapture:restart}=await import("./capture-recovery");
    const result=await restart({...operands(stage),store:await localCaptureStore(root,"synthetic")});
    expect(result.status).toBe("reconciled");
    const bytes=await readFile(path.join(disk.directory,"state.json"),"utf8"), restored=decodeCaptureState(bytes,FEED_NOW+CAPTURE_DAY);
    expect(restored.lastGood).toEqual(JSON.parse(stage.state!).lastGood); expect(restored.pending).toBeNull();
    expect(await restart({...operands(stage),store:disk})).toMatchObject({reason:"recovery-state-conflict"});
  });
  it("does not break an orphan lock to reconcile",async()=>{
    const stage=await interrupted(), disk=await localCaptureStore(await temporaryWorkspace(),"synthetic");
    await disk.withLock(io=>io.commitState(stage.state!,null));
    const target=path.join(disk.directory,"capture.lock");await writeFile(target,"another operator");
    expect(await reconcilePendingCapture({...operands(stage),store:disk})).toMatchObject({reason:"capture-locked"});
    expect(await readFile(target,"utf8")).toBe("another operator");
  });
});
