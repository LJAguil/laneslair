import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe,it,expect,vi } from 'vitest';
vi.mock('@/lib/store/app-store',()=>({useAppState:()=>({journalAdditionDrafts:{}}),useAppActions:()=>({})}));
import { AdditionCard } from '@/components/journal/journal-additions';
const base={id:'id',date:'2026-11-09',body:'Synthetic journal text',revision:1,createdAt:'2026-11-09T14:00:00Z',updatedAt:'2026-11-09T14:00:00Z',legacy:false,sourceNoteId:null};
describe('addition timestamps (simulated rendering)',()=>{
 it('shows the actual added timestamp and individual edit control without inventing edits',()=>{const html=renderToStaticMarkup(createElement(AdditionCard,{addition:base,reload:async()=>{}}));expect(html).toContain('dateTime="2026-11-09T14:00:00Z"');expect(html).toContain('Added');expect(html).toContain('Edit this addition');expect(html).not.toContain('Last edited');});
 it('keeps legacy timing honest and separates edits from original added time',()=>{const html=renderToStaticMarkup(createElement(AdditionCard,{addition:{...base,legacy:true,updatedAt:'2026-11-09T17:00:00Z'},reload:async()=>{}}));expect(html).toContain('first saved');expect(html).toContain('individual times weren’t recorded');expect(html).toContain('Last edited');expect(html).toContain('dateTime="2026-11-09T14:00:00Z"');expect(html).toContain('dateTime="2026-11-09T17:00:00Z"');});
});
