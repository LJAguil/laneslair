import { addDays } from "@/lib/dates";
import { validDay } from "../rune-lock";
import { puzzleKey } from "../catalog";
import { ECHO_PACK,ROUNDS_PER_DAY,type EchoRound } from "./pack";
export interface EchoRoundProgress {guesses:string[];hintUsed:boolean}
export interface EchoDay {rounds:Record<string,EchoRoundProgress>}
export interface EchoProgress {version:1;showStreak:boolean;days:Record<string,EchoDay>}
export const emptyEcho=():EchoProgress=>({version:1,showStreak:false,days:{}});
export const emptyEchoDay=():EchoDay=>({rounds:{}});
export const emptyRound=():EchoRoundProgress=>({guesses:[],hintUsed:false});
export const echoKey=(date:string)=>puzzleKey({game:"echoes",version:1,date,difficulty:"standard"});
export function validatePack(){
 if(!ECHO_PACK.length||ECHO_PACK.length%ROUNDS_PER_DAY!==0)throw new Error("Echoes pack must contain complete daily sets.");const ids=new Set<string>();
 for(const round of ECHO_PACK){const options=new Set(round.choices.map(c=>c.id));if(ids.has(round.id)||!round.id||!round.image.trim()||!round.before.trim()||!round.after.trim()||!round.hint.trim()||!round.explanation.trim()||round.choices.length<3||options.size!==round.choices.length||round.choices.some(c=>!c.id||!c.label.trim())||!round.answers.length||new Set(round.answers).size!==round.answers.length||round.answers.some(a=>!options.has(a))||round.answers.length===round.choices.length)throw new Error("Invalid Echoes content.");ids.add(round.id);}
}
export function roundsFor(date:string):readonly EchoRound[]{
 if(!validDay(date))throw new Error("Choose a valid puzzle date.");const sets=ECHO_PACK.length/ROUNDS_PER_DAY,index=((Math.floor(Date.parse(`${date}T00:00:00Z`)/86400000)%sets)+sets)%sets;return ECHO_PACK.slice(index*ROUNDS_PER_DAY,(index+1)*ROUNDS_PER_DAY);
}
export const roundSolved=(round:EchoRound,state:EchoRoundProgress|undefined)=>Boolean(state?.guesses.some(guess=>round.answers.includes(guess)));
export const daySolved=(date:string,day:EchoDay|undefined)=>roundsFor(date).every(round=>roundSolved(round,day?.rounds[round.id]));
export function guessEcho(date:string,day:EchoDay,roundId:string,choice:string):EchoDay{
 const round=roundsFor(date).find(r=>r.id===roundId);if(!round||!round.choices.some(c=>c.id===choice))throw new Error("Choose a word from this round’s bank.");const previous=day.rounds[roundId]??emptyRound();
 if(roundSolved(round,previous))throw new Error("This image is already matched.");if(previous.guesses.includes(choice))throw new Error("You’ve tried that word. Choose another.");
 return {rounds:{...day.rounds,[roundId]:{...previous,guesses:[...previous.guesses,choice]}}};
}
export function hintEcho(date:string,day:EchoDay,roundId:string):EchoDay{
 const round=roundsFor(date).find(r=>r.id===roundId);if(!round)throw new Error("Unknown round.");const previous=day.rounds[roundId]??emptyRound();if(roundSolved(round,previous)||previous.hintUsed)return day;return {rounds:{...day.rounds,[roundId]:{...previous,hintUsed:true}}};
}
export function parseEcho(raw:string|null):EchoProgress{
 if(!raw)return emptyEcho();if(raw.length>2000000)throw new Error("Echoes history is too large. Existing data is preserved.");const data:unknown=JSON.parse(raw);
 if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Invalid Echoes history.");const value=data as EchoProgress;
 if(value.version!==1||typeof value.showStreak!=="boolean"||!value.days||typeof value.days!=="object"||Array.isArray(value.days))throw new Error("Unknown or invalid Echoes history. Existing data is preserved.");
 const days:EchoProgress["days"]={};
 for(const [key,day] of Object.entries(value.days)){
  const match=/^echoes\/v1\/(\d{4}-\d{2}-\d{2})\/standard$/.exec(key);if(!match||!day||typeof day!=="object"||Array.isArray(day)||Object.keys(day).join()!=="rounds"||!day.rounds||typeof day.rounds!=="object"||Array.isArray(day.rounds))throw new Error("Invalid Echoes daily identity/state.");
  let rebuilt=emptyEchoDay();for(const [id,state] of Object.entries(day.rounds)){
   if(!state||typeof state!=="object"||Array.isArray(state)||Object.keys(state).some(k=>!["guesses","hintUsed"].includes(k))||!Array.isArray(state.guesses)||typeof state.hintUsed!=="boolean")throw new Error("Invalid Echoes round.");
   const round=roundsFor(match[1]).find(r=>r.id===id);if(!round||state.guesses.length>round.choices.length)throw new Error("Invalid Echoes round identity.");
   for(const guess of state.guesses){if(typeof guess!=="string")throw new Error("Invalid Echoes word.");rebuilt=guessEcho(match[1],rebuilt,id,guess);}
   rebuilt.rounds[id]={guesses:rebuilt.rounds[id]?.guesses??[],hintUsed:state.hintUsed};
  }days[key]=rebuilt;
 }return {version:1,showStreak:value.showStreak,days};
}
export function mergeEcho(a:EchoProgress,b:EchoProgress):EchoProgress{
 const days={...a.days};for(const [key,next] of Object.entries(b.days)){const previous=days[key];if(!previous){days[key]=next;continue;}const rounds={...previous.rounds};for(const [id,entry] of Object.entries(next.rounds)){const old=rounds[id];if(!old){rounds[id]=entry;continue;}if(old.guesses.slice(0,Math.min(old.guesses.length,entry.guesses.length)).some((g,i)=>g!==entry.guesses[i]))throw new Error(`Different answers for ${key}/${id}. Both copies are preserved.`);rounds[id]={guesses:old.guesses.length>entry.guesses.length?old.guesses:entry.guesses,hintUsed:old.hintUsed||entry.hintUsed};}days[key]={rounds};}return {...b,days};
}
export function sameEchoDay(a:EchoDay,b:EchoDay|undefined){return Boolean(b&&Object.keys(a.rounds).length===Object.keys(b.rounds).length&&Object.entries(a.rounds).every(([id,x])=>{const y=b.rounds[id];return y&&x.hintUsed===y.hintUsed&&JSON.stringify(x.guesses)===JSON.stringify(y.guesses);}));}
export function sameEcho(a:EchoProgress,b:EchoProgress){return a.version===b.version&&a.showStreak===b.showStreak&&Object.keys(a.days).length===Object.keys(b.days).length&&Object.keys(a.days).every(key=>sameEchoDay(a.days[key],b.days[key]));}
export function echoSummary(date:string,day:EchoDay|undefined){const rounds=roundsFor(date);return {matched:rounds.filter(r=>roundSolved(r,day?.rounds[r.id])).length,total:rounds.length,firstTry:rounds.filter(r=>roundSolved(r,day?.rounds[r.id])&&day!.rounds[r.id].guesses.length===1).length,hints:rounds.filter(r=>day?.rounds[r.id]?.hintUsed).length,misses:rounds.reduce((sum,r)=>sum+(day?.rounds[r.id]?.guesses.filter(g=>!r.answers.includes(g)).length??0),0)};}
export function echoStreak(progress:EchoProgress,today:string){if(!progress.showStreak)return 0;const dates=new Set(Object.keys(progress.days).filter(key=>daySolved(key.split('/')[2],progress.days[key])).map(key=>key.split('/')[2]));let cursor=dates.has(today)?today:addDays(today,-1),count=0;while(dates.has(cursor)){count++;cursor=addDays(cursor,-1);}return count;}
