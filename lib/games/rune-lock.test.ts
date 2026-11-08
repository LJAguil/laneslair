import { describe, expect, it } from "vitest";
import { addGuess, clueFor, dailyLock, emptyProgress, finished, MAX_GUESSES, parseProgress, puzzleStreak, revealHint, RUNES, shareLock, solved, type Rune } from "./rune-lock";
import { createPlayStore, mergePlayProgress, type PlayStorage } from "./play-store";

const DAY="2026-11-07";
const wrong=():Rune[][]=>RUNES.map(rune=>[rune,rune,rune,rune]).filter(guess=>guess.join(",")!==dailyLock(DAY).join(","));
function memory(){const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};}
describe("Rune Lock rules",()=>{
  it("keeps the versioned daily combination stable and creates a different challenge tomorrow",()=>{
    expect(dailyLock(DAY)).toEqual(["wave","key","compass","compass"]);
    expect(dailyLock(DAY)).not.toEqual(dailyLock("2026-11-08"));
    expect(dailyLock(DAY)).toHaveLength(4);expect(dailyLock(DAY).every(rune=>RUNES.includes(rune))).toBe(true);
    expect(()=>dailyLock("2026-02-30")).toThrow(/Invalid/);
  });
  it("allocates exact matches before elsewhere clues, without overcounting repeated runes",()=>{
    expect(clueFor(["key","key","key","moon"],["key","moon","leaf","flame"])).toEqual(["exact","absent","absent","present"]);
    expect(clueFor(["moon","moon","key","key"],["key","key","moon","moon"])).toEqual(["present","present","present","present"]);
  });
  it("requires a full guess, rejects duplicate attempts and prevents guesses after a win",()=>{
    const initial=emptyProgress();expect(()=>addGuess(initial,DAY,["key"])).toThrow(/four/);
    const first=addGuess(initial,DAY,wrong()[0]);expect(initial.days[DAY]).toBeUndefined();
    expect(()=>addGuess(first,DAY,wrong()[0])).toThrow(/tried/);
    const won=addGuess(first,DAY,dailyLock(DAY));expect(solved(DAY,won.days[DAY])).toBe(true);
    expect(()=>addGuess(won,DAY,wrong()[1])).toThrow(/finished/);
  });
  it("ends after six failed attempts and starts a new local-calendar day independently",()=>{
    let progress=emptyProgress();for(const guess of wrong())progress=addGuess(progress,DAY,guess);
    expect(progress.days[DAY].guesses).toHaveLength(MAX_GUESSES);expect(finished(DAY,progress.days[DAY])).toBe(true);expect(solved(DAY,progress.days[DAY])).toBe(false);
    expect(()=>addGuess(progress,DAY,dailyLock(DAY))).toThrow(/finished/);
    expect(finished("2026-11-08",progress.days["2026-11-08"])).toBe(false);
  });
  it("keeps hints optional and records them without consuming attempts",()=>{
    const progress=revealHint(emptyProgress(),DAY);expect(progress.days[DAY]).toEqual({guesses:[],hintUsed:true});
    expect(revealHint(progress,DAY)).toEqual(progress);
    const won=addGuess(progress,DAY,dailyLock(DAY));expect(shareLock(DAY,won.days[DAY])).toContain("hint used");
  });
  it("makes streaks opt-in, preserves yesterday's streak while today is unfinished, and breaks on a miss",()=>{
    let progress=addGuess(emptyProgress(),"2026-11-06",dailyLock("2026-11-06"));expect(puzzleStreak(progress,DAY)).toBe(0);
    progress={...progress,showStreak:true};expect(puzzleStreak(progress,DAY)).toBe(1);
    const won=addGuess(progress,DAY,dailyLock(DAY));expect(puzzleStreak(won,DAY)).toBe(2);expect(puzzleStreak(won,"2026-11-09")).toBe(0);
    for(const guess of wrong())progress=addGuess(progress,DAY,guess);expect(puzzleStreak(progress,DAY)).toBe(0);
  });
  it("validates saved data and does not include runes in a spoiler-free result",()=>{
    const won=addGuess(emptyProgress(),DAY,dailyLock(DAY));expect(parseProgress(JSON.stringify(won))).toEqual(won);
    for(const raw of ['{bad',JSON.stringify({...won,version:99}),JSON.stringify({...won,days:{bad:won.days[DAY]}})])expect(()=>parseProgress(raw)).toThrow();
    const text=shareLock(DAY,won.days[DAY]);expect(text).toContain("1/6");for(const rune of RUNES)expect(text.toLowerCase()).not.toContain(rune);
  });
});
describe("device-local puzzle persistence",()=>{
  it("restores guesses and preferences after reopening, isolated by verified account ID",()=>{
    const storage=memory(),first=createPlayStore("account-a",storage);first.guess(DAY,wrong()[0]);first.streak(true);
    expect(createPlayStore("account-a",storage).getSnapshot().progress.days[DAY].guesses).toEqual([wrong()[0]]);
    expect(createPlayStore("account-a",storage).getSnapshot().progress.showStreak).toBe(true);
    expect(createPlayStore("account-b",storage).getSnapshot().progress.days).toEqual({});
  });
  it("retains in-memory progress on storage failure and supports a later successful retry",()=>{
    const data=memory();let blocked=true;
    const storage:PlayStorage={getItem:data.getItem,setItem:(key,value)=>{if(blocked)throw new Error("blocked");data.setItem(key,value);}};
    const store=createPlayStore("account",storage);store.guess(DAY,wrong()[0]);expect(store.getSnapshot().error).not.toBeNull();expect(store.getSnapshot().progress.days[DAY].guesses).toHaveLength(1);
    blocked=false;store.retry();expect(store.getSnapshot().error).toBeNull();expect(createPlayStore("account",storage).getSnapshot().progress.days[DAY].guesses).toHaveLength(1);
  });
  it("does not overwrite a malformed saved record",()=>{
    const storage=memory();storage.setItem("lanes-lair-play-rune-lock-v1:account","broken data");const store=createPlayStore("account",storage);
    store.guess(DAY,wrong()[0]);expect(store.getSnapshot().error).not.toBeNull();expect(storage.getItem(store.key)).toBe("broken data");
  });
  it("preserves other days from another tab and refuses divergent attempts instead of silently discarding them",()=>{
    const storage=memory(),a=createPlayStore("account",storage),b=createPlayStore("account",storage);
    a.guess("2026-11-06",dailyLock("2026-11-06"));b.guess(DAY,wrong()[0]);
    expect(createPlayStore("account",storage).getSnapshot().progress.days["2026-11-06"]).toBeDefined();
    a.guess(DAY,wrong()[1]);expect(a.getSnapshot().error).toMatch(/Another tab/);
    expect(createPlayStore("account",storage).getSnapshot().progress.days[DAY].guesses).toEqual([wrong()[0]]);
  });
  it("merges a hint with a longer compatible guess history",()=>{
    const saved=addGuess(emptyProgress(),DAY,wrong()[0]),next=revealHint(emptyProgress(),DAY);
    expect(mergePlayProgress(saved,next).days[DAY]).toEqual({guesses:[wrong()[0]],hintUsed:true});
  });
});
