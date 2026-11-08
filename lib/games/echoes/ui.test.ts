import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe,it,expect,vi } from "vitest";
import { ECHO_PACK } from "./pack";
import { emptyRound,emptyEcho,echoKey,guessEcho,emptyEchoDay,roundsFor,hintEcho } from "./rules";
import { createEchoStore } from "./store";
vi.mock('@/lib/store/app-store',()=>({useAppState:()=>({today:'2026-11-08'})}));
vi.mock('@/components/play/use-echo-progress',()=>({useEchoProgress:()=>({progress:emptyEcho(),bundle:null,error:null,retry:()=>{}})}));
import { EchoesView,EchoRoundView,EchoGame } from "@/components/play/echoes-view";
import { navItems } from "@/components/shell/nav-items";
const no=()=>{};
describe('Echoes accessible presentation (simulated markup)',()=>{
 it('uses semantic emphasis and explicit key-image text, named word choices and theme tokens',()=>{const round=ECHO_PACK[0],html=renderToStaticMarkup(createElement(EchoRoundView,{round,state:emptyRound(),onAnswer:no,onHint:no}));expect(html).toContain('<strong');expect(html).toContain('Key image:');expect(html).toContain('Match the image to a meaning');expect(html).toContain('Passing time');expect(html).toContain('Reveal a hint');expect(html).toContain('min-h-12');expect(html).toContain('text-fg');expect(html).not.toContain('The connection');});
 it('explains alternate answers only after a match, reports misses with text and retains hint disclosure',()=>{const round=ECHO_PACK.find(r=>r.id==='letter-fold')!;let html=renderToStaticMarkup(createElement(EchoRoundView,{round,state:{guesses:['2'],hintUsed:true},onAnswer:no,onHint:no}));expect(html).toContain('Try another');expect(html).toContain('Hint:');expect(html).not.toContain('The connection');html=renderToStaticMarkup(createElement(EchoRoundView,{round,state:{guesses:['2','4'],hintUsed:true},onAnswer:no,onHint:no}));expect(html).toContain('The connection');expect(html).toContain('Both accepted: Memory / Remembrance');expect(html).toContain('2 answers');expect(html).toContain('hint used');expect(html).not.toContain('Reveal a hint');});
 it('discloses three daily rounds, six-day reuse and first-answer semantics without adding navigation destinations',()=>{const date='2026-11-08',progress=emptyEcho(),round=roundsFor(date)[0],day=hintEcho(date,guessEcho(date,emptyEchoDay(),round.id,round.answers[0]),roundsFor(date)[1].id);progress.days[echoKey(date)]=day;const store=createEchoStore('A',{getItem:()=>null,setItem:no}),html=renderToStaticMarkup(createElement(EchoGame,{date,progress,store}));expect(html).toContain('1/3 images matched');expect(html).toContain('18 original scenes');expect(html).toContain('repeats every 6 days');expect(html).toContain('First-answer matches include hinted answers');expect(navItems.slice(0,4).map(item=>item.href)).toEqual(['/','/inbox','/tasks','/projects']);});
 it('shows a distinct loading state before reading private history',()=>{const html=renderToStaticMarkup(createElement(EchoesView));expect(html).toContain('Loading your Echoes history');expect(html).not.toContain('0/3 images matched');});
});
