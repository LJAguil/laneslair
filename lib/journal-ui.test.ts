import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "@/lib/store/app-store";
import { initialJournalState } from "@/lib/store/journal-state";
const mock=vi.hoisted(()=>({state:{} as AppState,save:vi.fn(),append:vi.fn(),load:vi.fn(),push:vi.fn()}));
vi.mock("@/lib/store/app-store",()=>({useAppState:()=>mock.state,useAppActions:()=>({saveJournal:mock.save,addCaptureToJournal:mock.append,loadJournalDate:mock.load,loadJournalIndex:mock.load,loadInbox:mock.load})}));
vi.mock("next/navigation",()=>({useSearchParams:()=>new URLSearchParams("date=2026-11-07"),useRouter:()=>({push:mock.push})}));
import { JournalView } from "@/components/journal/journal-view";
import { InboxView } from "@/components/inbox/inbox-view";
import { navItems } from "@/components/shell/nav-items";
const DATE="2026-11-07",note={id:"note",body:"My original capture",createdAt:"2026-11-07T12:00Z",updatedAt:"2026-11-07T12:00Z"};
beforeEach(()=>{
  vi.clearAllMocks();mock.state={...initialJournalState,journalEntries:{},today:DATE,journalIndexStatus:"ready",journalDayStatus:{[DATE]:"ready"},journalDrafts:{[DATE]:{body:"",base:null}},inboxNotes:[note],inboxStatus:"ready",inboxError:null,pendingNoteIds:[],tasks:[],tasksStatus:"ready"} as unknown as AppState;
});
describe("Journal/Inbox rendered controls (simulated, not live browser interaction)",()=>{
  it("offers Add to journal next to Make this a task without writing anything on open",()=>{
    const html=renderToStaticMarkup(createElement(InboxView));expect(html).toContain("Add to journal");expect(html).toContain("Make this a task");expect(html).toContain("My original capture");
    expect(mock.save).not.toHaveBeenCalled();expect(mock.append).not.toHaveBeenCalled();
  });
  it("moves linked captures out of unsorted Inbox without removing originals",()=>{
    mock.state.journalSources=[{id:"source",noteId:note.id,entryId:"entry",date:DATE,addedAt:note.createdAt}];
    const html=renderToStaticMarkup(createElement(InboxView));expect(html).toContain("Room for your next idea");expect(mock.state.inboxNotes).toEqual([note]);
  });
  it("shows an empty dated editor with explicit save and no claim of autosave",()=>{
    const html=renderToStaticMarkup(createElement(JournalView));expect(html).toContain('type="date"');expect(html).toContain('id="journal-body"');expect(html).toContain("Save entry");expect(html).toContain("Save before closing or refreshing");
    expect(mock.save).not.toHaveBeenCalled();expect(mock.load).not.toHaveBeenCalled();
  });
  it("shows setup errors instead of an empty saved-date list",()=>{
    mock.state.journalIndexStatus="error";mock.state.journalIndexError="Journal setup needed";
    const html=renderToStaticMarkup(createElement(JournalView));expect(html).toContain("Journal setup needed");expect(html).not.toContain("Your first saved entry will appear here");
  });
  it("keeps an unsaved draft visible and offers explicit review/merge for a newer saved version",()=>{
    const original={id:"entry",date:DATE,body:"Old saved",revision:1,createdAt:note.createdAt,updatedAt:note.createdAt};
    mock.state.journalEntries[DATE]={...original,body:"New saved writing",revision:2};mock.state.journalDrafts[DATE]={body:"My unsaved draft",base:original};
    const html=renderToStaticMarkup(createElement(JournalView));expect(html).toContain("My unsaved draft");expect(html).toContain("New saved writing");expect(html).toContain("Combine saved entry + my draft");expect(html).toContain("Nothing is written until you save");
  });
  it("keeps the four main phone destinations and adds Journal to the remaining navigation",()=>{
    expect(navItems.slice(0,4).map(item=>item.href)).toEqual(["/","/inbox","/tasks","/projects"]);expect(navItems.find(item=>item.href==="/journal")?.label).toBe("Journal");
  });
});
