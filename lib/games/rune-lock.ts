import { addDays } from "@/lib/dates";

export const RUNES=["key","flame","leaf","moon","wave","compass"] as const;
export type Rune=typeof RUNES[number];
export type Clue="exact"|"present"|"absent";
export const LOCK_SIZE=4,MAX_GUESSES=6;
export interface LockDay { guesses:Rune[][]; hintUsed:boolean }
export interface PlayProgress { version:1; showStreak:boolean; days:Record<string,LockDay> }
export const emptyProgress=():PlayProgress=>({version:1,showStreak:false,days:{}});
export const validDay=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
export const isRune=(value:unknown):value is Rune=>typeof value==="string"&&(RUNES as readonly string[]).includes(value);

/** Versioned and deterministic. This casual client-side puzzle is not an anti-cheat system. */
export function dailyLock(day:string):Rune[] {
  if(!validDay(day))throw new Error("Invalid puzzle day");
  let seed=2166136261;
  for(const char of `lair-rune-lock-v1:${day}`)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  return Array.from({length:LOCK_SIZE},()=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return RUNES[Math.floor((seed/4294967296)*RUNES.length)];
  });
}
export function clueFor(guess:readonly Rune[],answer:readonly Rune[]):Clue[] {
  if(guess.length!==LOCK_SIZE||answer.length!==LOCK_SIZE)throw new Error("Choose four runes");
  const result:Clue[]=guess.map((rune,index)=>rune===answer[index]?"exact":"absent");
  const remaining=new Map<Rune,number>();
  answer.forEach((rune,index)=>{if(result[index]!=="exact")remaining.set(rune,(remaining.get(rune)??0)+1);});
  guess.forEach((rune,index)=>{if(result[index]!=="exact"&&(remaining.get(rune)??0)>0){result[index]="present";remaining.set(rune,remaining.get(rune)!-1);}});
  return result;
}
export function solved(day:string,progress:LockDay|undefined):boolean {
  return Boolean(progress?.guesses.some(guess=>clueFor(guess,dailyLock(day)).every(clue=>clue==="exact")));
}
export function finished(day:string,progress:LockDay|undefined):boolean {return solved(day,progress)||(progress?.guesses.length??0)>=MAX_GUESSES;}
export function addGuess(progress:PlayProgress,day:string,guess:readonly Rune[]):PlayProgress {
  if(!validDay(day)||guess.length!==LOCK_SIZE||!guess.every(isRune))throw new Error("Choose four runes before submitting.");
  const previous=progress.days[day]??{guesses:[],hintUsed:false};
  if(finished(day,previous))throw new Error("Today’s lock is finished. A fresh one arrives tomorrow.");
  if(previous.guesses.some(row=>row.join(",")===guess.join(",")))throw new Error("You’ve tried that combination. Try a different one.");
  return {...progress,days:{...progress.days,[day]:{...previous,guesses:[...previous.guesses,[...guess]]}}};
}
export function revealHint(progress:PlayProgress,day:string):PlayProgress {
  if(!validDay(day))throw new Error("Invalid puzzle day");
  const previous=progress.days[day]??{guesses:[],hintUsed:false};
  if(finished(day,previous))return progress;
  return {...progress,days:{...progress.days,[day]:{...previous,hintUsed:true}}};
}
export function puzzleStreak(progress:PlayProgress,today:string):number {
  if(!progress.showStreak)return 0;
  // An unfinished day keeps yesterday's streak; an exhausted day breaks it.
  let cursor=solved(today,progress.days[today])?today:addDays(today,-1),count=0;
  if(finished(today,progress.days[today])&&!solved(today,progress.days[today]))return 0;
  while(solved(cursor,progress.days[cursor])){count++;cursor=addDays(cursor,-1);}
  return count;
}
export function shareLock(day:string,progress:LockDay):string {
  const won=solved(day,progress);
  return [`Lane’s Lair · Rune Lock · ${day}`,`${won?progress.guesses.length:"X"}/${MAX_GUESSES}${progress.hintUsed?" · hint used":""}`,
    ...progress.guesses.map(guess=>clueFor(guess,dailyLock(day)).map(clue=>({exact:"🟩",present:"🟨",absent:"⬛"})[clue]).join(""))].join("\n");
}
export function parseProgress(raw:string|null):PlayProgress {
  if(!raw)return emptyProgress();
  if(raw.length>1000000)throw new Error("Saved puzzle data is too large.");
  const data:unknown=JSON.parse(raw);
  if(!data||typeof data!=="object")throw new Error("Invalid saved puzzle data.");
  const value=data as Partial<PlayProgress>;
  if(value.version!==1||typeof value.showStreak!=="boolean"||!value.days||typeof value.days!=="object"||Array.isArray(value.days))throw new Error("Invalid saved puzzle data.");
  const days:Record<string,LockDay>={};
  for(const [day,entry] of Object.entries(value.days)){
    if(!validDay(day)||!entry||typeof entry.hintUsed!=="boolean"||!Array.isArray(entry.guesses)||entry.guesses.length>MAX_GUESSES)throw new Error("Invalid saved puzzle day.");
    let rebuilt=emptyProgress();
    for(const guess of entry.guesses) {if(!Array.isArray(guess))throw new Error("Invalid saved guess.");rebuilt=addGuess(rebuilt,day,guess);}
    days[day]={guesses:rebuilt.days[day]?.guesses??[],hintUsed:entry.hintUsed};
  }
  return {version:1,showStreak:value.showStreak,days};
}
