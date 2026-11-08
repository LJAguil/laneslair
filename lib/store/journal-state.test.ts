import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InboxNote, JournalEntry, JournalSource } from "@/lib/types";
import { TaskDataError } from "@/lib/data/tasks";
vi.mock("@/lib/data/journal",async original=>({...await original<typeof import("@/lib/data/journal")>(),fetchJournalEntry:vi.fn(),fetchJournalIndex:vi.fn(),saveJournalEntry:vi.fn(),appendCaptureToJournal:vi.fn()}));
vi.mock("@/lib/data/tasks",async original=>({...await original<typeof import("@/lib/data/tasks")>(),getVerifiedUserId:vi.fn(async()=>"verified-user")}));
import * as data from "@/lib/data/journal";
import { createJournalActions, initialJournalState, reduceJournal, type JournalAction, type JournalSlice } from "./journal-state";

const DATE="2026-11-07";
const entry:JournalEntry={id:"entry",date:DATE,body:"Saved",revision:1,createdAt:"2026-11-07T12:00:00Z",updatedAt:"2026-11-07T12:00:00Z"};
const note:InboxNote={id:"note",body:"A thought",createdAt:entry.createdAt,updatedAt:entry.updatedAt};
const source:JournalSource={id:"source",noteId:note.id,entryId:entry.id,date:DATE,addedAt:entry.createdAt};
beforeEach(()=>vi.clearAllMocks());
function setup(){let state:JournalSlice={...initialJournalState};const notify=vi.fn();const dispatch=(action:JournalAction)=>{state=reduceJournal(state,action);};return {actions:createJournalActions(dispatch,notify),dispatch,notify,state:()=>state};}
describe("Journal store recovery",()=>{
  it("preserves drafts when saved text changes and only advances the baseline after explicit combine",()=>{
    const test=setup();test.dispatch({type:"journal/entry",date:DATE,entry});test.actions.setJournalDraft(DATE,"My draft");
    test.dispatch({type:"journal/entry",date:DATE,entry:{...entry,revision:2,body:"Other device"}});
    expect(test.state().journalDrafts[DATE]).toEqual({body:"My draft",base:entry});
    test.actions.mergeJournalDraft(DATE);expect(test.state().journalDrafts[DATE].body).toBe("Other device\n\nMy draft");expect(test.state().journalDrafts[DATE].base?.revision).toBe(2);
  });
  it("does not silently adopt a newly created remote entry while typing a new local draft",()=>{
    const test=setup();test.dispatch({type:"journal/entry",date:DATE,entry:null});test.actions.setJournalDraft(DATE,"New local draft");
    test.dispatch({type:"journal/entry",date:DATE,entry});test.actions.setJournalDraft(DATE,"Still typing");
    expect(test.state().journalDrafts[DATE].base).toBeNull();expect(test.state().journalDrafts[DATE].body).toBe("Still typing");
  });
  it("reuses the same request after an uncertain failure without clearing input or claiming success",async()=>{
    const test=setup();test.dispatch({type:"journal/entry",date:DATE,entry:null});test.actions.setJournalDraft(DATE,"Writing");
    vi.mocked(data.saveJournalEntry).mockRejectedValueOnce(new TaskDataError("Offline")).mockResolvedValueOnce({...entry,body:"Writing"});
    const draft=test.state().journalDrafts[DATE];await expect(test.actions.saveJournal(DATE,draft)).rejects.toThrow("Offline");
    expect(test.state().journalDrafts[DATE].body).toBe("Writing");expect(test.notify).not.toHaveBeenCalled();
    await test.actions.saveJournal(DATE,draft);
    expect(vi.mocked(data.saveJournalEntry).mock.calls[0][0].id).toBe(vi.mocked(data.saveJournalEntry).mock.calls[1][0].id);
    expect(test.state().journalDrafts[DATE].base?.id).toBe(entry.id);expect(test.state().pendingJournalDates).toEqual([]);
  });
  it("loads latest text on conflict and preserves the user's draft until explicit review",async()=>{
    const test=setup();test.dispatch({type:"journal/entry",date:DATE,entry});test.actions.setJournalDraft(DATE,"My draft");
    vi.mocked(data.saveJournalEntry).mockRejectedValueOnce(new data.JournalConflictError("Changed"));vi.mocked(data.fetchJournalEntry).mockResolvedValueOnce({...entry,body:"Appended elsewhere",revision:2});
    await expect(test.actions.saveJournal(DATE,test.state().journalDrafts[DATE])).rejects.toThrow("Changed");
    expect(test.state().journalDrafts[DATE].body).toBe("My draft");expect(test.state().journalDrafts[DATE].base?.revision).toBe(1);expect(test.state().journalEntries[DATE]?.body).toBe("Appended elsewhere");
    expect(test.notify).not.toHaveBeenCalled();
  });
  it("preserves a draft when a confirmed save's entry was subsequently removed",async()=>{
    const test=setup();test.dispatch({type:"journal/entry",date:DATE,entry:null});test.actions.setJournalDraft(DATE,"My draft");vi.mocked(data.saveJournalEntry).mockResolvedValueOnce(null);
    await expect(test.actions.saveJournal(DATE,test.state().journalDrafts[DATE])).rejects.toThrow(/no longer available/);
    expect(test.state().journalDrafts[DATE].missingSavedEntry).toBe(true);test.actions.mergeJournalDraft(DATE);
    expect(test.state().journalDrafts[DATE]).toEqual({body:"My draft",base:null});
  });
  it("keeps a journalled capture out of a slower index read and leaves an open draft unchanged",async()=>{
    const test=setup();test.dispatch({type:"journal/entry",date:DATE,entry});test.actions.setJournalDraft(DATE,"My draft");
    let resolve!:(value:Awaited<ReturnType<typeof data.fetchJournalIndex>>)=>void;
    vi.mocked(data.fetchJournalIndex).mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
    const loading=test.actions.loadJournalIndex();await vi.waitFor(()=>expect(data.fetchJournalIndex).toHaveBeenCalled());
    vi.mocked(data.appendCaptureToJournal).mockResolvedValueOnce({entry:{...entry,body:"Saved\n\nA thought",revision:2},source,replayed:false});
    await test.actions.addCaptureToJournal(note,DATE);resolve({dates:[],sources:[]});await loading;
    expect(test.state().journalSources).toEqual([source]);expect(test.state().journalDates[0].revision).toBe(2);expect(test.state().journalDrafts[DATE].body).toBe("My draft");
  });
  it("does not publish a link or success toast if an append fails, and releases its busy flag",async()=>{
    const test=setup();vi.mocked(data.appendCaptureToJournal).mockRejectedValueOnce(new TaskDataError("Offline"));
    await expect(test.actions.addCaptureToJournal(note,DATE)).rejects.toThrow("Offline");expect(test.state().journalSources).toEqual([]);expect(test.notify).not.toHaveBeenCalled();expect(test.state().pendingJournalNotes).toEqual([]);
  });
  it("does not mistake failed reads for an empty day and retains an existing unsaved draft",async()=>{
    const test=setup();test.dispatch({type:"journal/entry",date:DATE,entry});test.actions.setJournalDraft(DATE,"Unsaved");
    vi.mocked(data.fetchJournalEntry).mockRejectedValueOnce(new TaskDataError("Setup needed"));await test.actions.loadJournalDate(DATE);
    expect(test.state().journalDayStatus[DATE]).toBe("error");expect(test.state().journalEntries[DATE]).toEqual(entry);expect(test.state().journalDrafts[DATE].body).toBe("Unsaved");
    vi.mocked(data.fetchJournalIndex).mockRejectedValueOnce(new TaskDataError("Setup needed"));await test.actions.loadJournalIndex();expect(test.state().journalIndexStatus).toBe("error");
  });
  it("prevents overlapping saves for one date",async()=>{
    const test=setup();let finish!:(entry:JournalEntry)=>void;
    vi.mocked(data.saveJournalEntry).mockImplementationOnce(()=>new Promise(done=>{finish=done;}));
    const draft={body:"Saved",base:null};const first=test.actions.saveJournal(DATE,draft);
    await vi.waitFor(()=>expect(data.saveJournalEntry).toHaveBeenCalled());await expect(test.actions.saveJournal(DATE,draft)).rejects.toThrow(/still saving/);finish(entry);await first;
    expect(data.saveJournalEntry).toHaveBeenCalledOnce();
  });
});
