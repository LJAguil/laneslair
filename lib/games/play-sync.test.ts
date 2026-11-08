import { describe,it,expect,vi } from "vitest";
import { createPlayStore,mergePlayProgress } from "./play-store";
import { createPlaySync } from "./play-sync";
import { previewImport,puzzleKey,runeIdentity,importProgress,sameProgress,type AccountPlay,type PlayAccountAdapter } from "./catalog";
import { addGuess,emptyProgress,revealHint,dailyLock,type LockDay } from "./rune-lock";
const DAY="2026-11-08",WRONG=['key','key','key','key'] as const;
function memory(){const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};}
function server(){const account:AccountPlay={progress:emptyProgress(),preference:null};const adapter:PlayAccountAdapter={
  load:vi.fn(async()=>structuredClone(account)),
  submit:vi.fn(async(date:string,state:LockDay)=>{account.progress=mergePlayProgress(account.progress,{...emptyProgress(),days:{[date]:structuredClone(state)}});account.progress.showStreak=account.preference?.showStreak??false;}),
  preference:vi.fn(async(show,revision)=>{if(account.preference&&show!==account.preference.showStreak&&revision!==account.preference.revision)throw new Error('Preference changed');if(!account.preference||show!==account.preference.showStreak)account.preference={showStreak:show,revision:(account.preference?.revision??0)+1};account.progress.showStreak=show;}),
};return {adapter,get:()=>account};}
async function idle(sync:ReturnType<typeof createPlaySync>){await vi.waitFor(()=>expect(sync.getSnapshot().busy).toBe(false));}
describe('catalog identity and explicit import',()=>{
  it('compares out-of-order imported dates semantically so sync does not loop on property order',()=>{
    const first=addGuess(addGuess(emptyProgress(),'2026-11-09',dailyLock('2026-11-09')),DAY,WRONG);
    const second=addGuess(addGuess(emptyProgress(),DAY,WRONG),'2026-11-09',dailyLock('2026-11-09'));
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));expect(sameProgress(first,second)).toBe(true);expect(sameProgress(first,revealHint(second,DAY))).toBe(false);
  });
  it('separates version, local date and difficulty without changing v1 identities',()=>{expect(puzzleKey(runeIdentity(DAY))).toBe('rune-lock/v1/2026-11-08/standard');expect(puzzleKey({...runeIdentity(DAY),version:2})).not.toBe(puzzleKey(runeIdentity(DAY)));expect(puzzleKey(runeIdentity('2026-11-09'))).not.toBe(puzzleKey(runeIdentity(DAY)));});
  it('previews compatible hints and blocks incompatible branches without changing either input',()=>{const a=addGuess(emptyProgress(),DAY,WRONG),b=revealHint(emptyProgress(),DAY),before=JSON.stringify([a,b]);expect(previewImport(a,b).merged?.days[DAY].hintUsed).toBe(true);expect(JSON.stringify([a,b])).toBe(before);expect(previewImport(a,addGuess(emptyProgress(),DAY,dailyLock(DAY))).conflicts).toEqual([DAY]);});
  it('resumes interrupted import and never duplicates guesses or deletes source history',async()=>{const remote=server(),local=addGuess(addGuess(emptyProgress(),DAY,WRONG),'2026-11-09',dailyLock('2026-11-09'));const original=JSON.stringify(local);const real=remote.adapter.submit;vi.mocked(remote.adapter.submit).mockImplementationOnce(real).mockRejectedValueOnce(new Error('offline'));await expect(importProgress(remote.adapter,previewImport(local,emptyProgress()),true,null)).rejects.toThrow('offline');const result=await importProgress(remote.adapter,previewImport(local,remote.get().progress),true,null);expect(result.progress.days).toEqual(local.days);expect(JSON.stringify(local)).toBe(original);});
});
describe('account sync controller (simulated devices)',()=>{
  it('finishes importing history captured in a different date order without repeated sync requests',async()=>{
    const storage=memory(),local=createPlayStore('A',storage),remote=server();local.hint('2026-11-09');local.guess(DAY,WRONG);
    const sync=createPlaySync('A',local,remote.adapter,storage);await sync.preview();await sync.confirm(false);await idle(sync);
    expect(sync.getSnapshot().error).toBeNull();expect(remote.adapter.load).toHaveBeenCalledTimes(4);expect(sameProgress(remote.get().progress,local.getSnapshot().progress)).toBe(true);sync.dispose();
  });
  it('serializes competing device submissions without replacing the winning branch',async()=>{
    const remote=server(),storageA=memory(),storageB=memory(),a=createPlayStore('A',storageA),b=createPlayStore('A',storageB);
    const sa=createPlaySync('A',a,remote.adapter,storageA),sb=createPlaySync('A',b,remote.adapter,storageB);
    await sa.preview();await sa.confirm(false);await sb.preview();await sb.confirm(false);
    a.guess(DAY,WRONG);b.guess(DAY,dailyLock(DAY));await Promise.all([idle(sa),idle(sb)]);
    expect([sa.getSnapshot().error,sb.getSnapshot().error].filter(Boolean)).toHaveLength(1);
    expect(a.getSnapshot().progress.days[DAY].guesses).toEqual([WRONG]);expect(b.getSnapshot().progress.days[DAY].guesses).toEqual([dailyLock(DAY)]);
    expect(remote.get().progress.days[DAY].guesses).toEqual([WRONG]);sa.dispose();sb.dispose();
  });
  it('keeps raw local history and leaves consent off when an import stops partway through',async()=>{
    const storage=memory(),local=createPlayStore('A',storage),remote=server();local.guess(DAY,WRONG);local.hint('2026-11-09');
    const raw=storage.getItem(local.key),sync=createPlaySync('A',local,remote.adapter,storage);
    await sync.preview();const real=remote.adapter.submit;vi.mocked(remote.adapter.submit).mockImplementationOnce(real).mockRejectedValueOnce(new Error('interrupted'));
    await sync.confirm(false);expect(sync.getSnapshot().enabled).toBe(false);expect(sync.getSnapshot().error).toBe('interrupted');expect(storage.getItem(local.key)).toBe(raw);expect(storage.getItem('lanes-lair-play-before-sync-v1:A')).toBe(raw);
    await sync.preview();await sync.confirm(false);expect(sync.getSnapshot().enabled).toBe(true);expect(remote.get().progress.days).toEqual(local.getSnapshot().progress.days);sync.dispose();
  });
  it('does not contact the account or mutate local storage before explicit preview/confirmation',async()=>{const storage=memory(),local=createPlayStore('A',storage),remote=server(),sync=createPlaySync('A',local,remote.adapter,storage);sync.start();local.guess(DAY,WRONG);expect(remote.adapter.load).not.toHaveBeenCalled();const original=storage.getItem(local.key);await sync.preview();expect(remote.adapter.submit).not.toHaveBeenCalled();await sync.confirm(false);expect(sync.getSnapshot().enabled).toBe(true);expect(storage.getItem('lanes-lair-play-before-sync-v1:A')).toBe(original);expect(remote.get().progress.days[DAY].guesses).toEqual([WRONG]);sync.dispose();});
  it('blocks conflicts and changing device progress after preview without overwriting history',async()=>{const storage=memory(),local=createPlayStore('A',storage),remote=server();local.guess(DAY,WRONG);await remote.adapter.submit(DAY,{guesses:[dailyLock(DAY)],hintUsed:false},'x');const sync=createPlaySync('A',local,remote.adapter,storage);await sync.preview();expect(sync.getSnapshot().preview?.conflicts).toEqual([DAY]);await sync.confirm(false);expect(local.getSnapshot().progress.days[DAY].guesses).toEqual([WRONG]);sync.dispose();const clean=server(),next=createPlaySync('A',local,clean.adapter,storage);await next.preview();local.hint(DAY);await next.confirm(false);expect(next.getSnapshot().error).toMatch(/changed after/);expect(clean.adapter.submit).not.toHaveBeenCalled();next.dispose();});
  it('merges compatible devices, syncs hint usage and refreshes account preferences',async()=>{const storageA=memory(),storageB=memory(),a=createPlayStore('A',storageA),b=createPlayStore('A',storageB),remote=server(),sa=createPlaySync('A',a,remote.adapter,storageA),sb=createPlaySync('A',b,remote.adapter,storageB);await sa.preview();await sa.confirm(false);await sb.preview();await sb.confirm(false);a.guess(DAY,WRONG);await idle(sa);sb.refresh();await idle(sb);expect(b.getSnapshot().progress.days[DAY].guesses).toEqual([WRONG]);b.hint(DAY);await idle(sb);sa.refresh();await idle(sa);expect(a.getSnapshot().progress.days[DAY].hintUsed).toBe(true);a.streak(true);await idle(sa);sb.refresh();await idle(sb);expect(b.getSnapshot().progress.showStreak).toBe(true);sa.dispose();sb.dispose();});
  it('retains unsent changes after a network failure and restarts with saved sync/streak preferences',async()=>{const storage=memory(),local=createPlayStore('A',storage),remote=server(),sync=createPlaySync('A',local,remote.adapter,storage);await sync.preview();await sync.confirm(false);vi.mocked(remote.adapter.load).mockRejectedValueOnce(new Error('offline'));local.streak(true);await idle(sync);expect(sync.getSnapshot().error).toBe('offline');sync.dispose();const reopened=createPlayStore('A',storage),next=createPlaySync('A',reopened,remote.adapter,storage);next.start();await idle(next);expect(next.getSnapshot().enabled).toBe(true);expect(remote.get().progress.showStreak).toBe(true);next.dispose();});
  it('keeps account-isolated activation and stops this device without deleting data',async()=>{const storage=memory(),local=createPlayStore('A',storage),remote=server(),sync=createPlaySync('A',local,remote.adapter,storage);await sync.preview();await sync.confirm(false);sync.disable();const calls=vi.mocked(remote.adapter.submit).mock.calls.length;local.guess(DAY,WRONG);expect(remote.adapter.submit).toHaveBeenCalledTimes(calls);const other=createPlaySync('B',createPlayStore('B',storage),remote.adapter,storage);other.start();expect(other.getSnapshot().enabled).toBe(false);expect(local.getSnapshot().progress.days[DAY]).toBeDefined();sync.dispose();other.dispose();});
  it('preserves both copies and stops automatic writes when devices submit divergent branches',async()=>{const storage=memory(),local=createPlayStore('A',storage),remote=server(),sync=createPlaySync('A',local,remote.adapter,storage);await sync.preview();await sync.confirm(false);await remote.adapter.submit(DAY,{guesses:[dailyLock(DAY)],hintUsed:false},'x');local.guess(DAY,WRONG);await idle(sync);expect(sync.getSnapshot().error).toMatch(/Different guesses/);expect(local.getSnapshot().progress.days[DAY].guesses).toEqual([WRONG]);expect(remote.get().progress.days[DAY].guesses).toEqual([dailyLock(DAY)]);sync.dispose();});
});
