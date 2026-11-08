import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({client:vi.fn(),rpc:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createClient:mock.client}));
import { appendCaptureToJournal, fetchJournalEntry, fetchJournalIndex, JournalConflictError, saveJournalEntry } from "./journal";
import { appendJournalBody, captureIsUnsorted, validJournalDate } from "@/lib/journal";
import type { JournalEntrySummary } from "@/lib/types";
const ID="11111111-1111-4111-8111-111111111111",DAY="2026-11-07";
const row={id:ID,user_id:ID,entry_date:DAY,body:"Exact\ntext",revision:3,created_at:"2026-11-07T00:00Z",updated_at:"2026-11-07T00:00Z"};
let calls:{table:string;method:string;args:unknown[]}[];let replies:{data:unknown;error:unknown}[];
beforeEach(()=>{
  vi.clearAllMocks();calls=[];replies=[];
  mock.client.mockReturnValue({rpc:mock.rpc,from:(table:string)=>{
    const chain:Record<string,unknown>={};
    for(const method of ["select","eq","order","range","maybeSingle"])chain[method]=(...args:unknown[])=>{calls.push({table,method,args});return chain;};
    chain.then=(resolve:(value:unknown)=>void)=>Promise.resolve(replies.shift()??{data:null,error:null}).then(resolve);return chain;
  }});
});
describe("typed journal data and calendar semantics",()=>{
  it("reads only the requested owned date and maps snake_case without timezone conversion",async()=>{
    replies.push({data:row,error:null});expect(await fetchJournalEntry(ID,DAY)).toMatchObject({date:DAY,body:"Exact\ntext",revision:3});
    expect(calls).toContainEqual({table:"journal_entries",method:"eq",args:["user_id",ID]});expect(calls).toContainEqual({table:"journal_entries",method:"eq",args:["entry_date",DAY]});
  });
  it("returns a null empty day only for a successful request and distinguishes missing migration/errors",async()=>{
    expect(await fetchJournalEntry(ID,DAY)).toBeNull();replies.push({data:null,error:{code:"42P01"}});await expect(fetchJournalEntry(ID,DAY)).rejects.toThrow(/migration 004/);
  });
  it("writes exact body and revision with a stable operation UUID, never a client-supplied user ID",async()=>{
    mock.rpc.mockResolvedValueOnce({data:{entry:row,replayed:false},error:null});await saveJournalEntry({id:ID,date:DAY,expectedRevision:2,body:"Exact\ntext"});
    expect(mock.rpc).toHaveBeenCalledWith("save_journal_entry",{p_operation_id:ID,p_date:DAY,p_expected_revision:2,p_body:"Exact\ntext"});
  });
  it("maps conflicts and missing/deleted destinations without silently recreating anything",async()=>{
    mock.rpc.mockResolvedValueOnce({data:null,error:{code:"40001"}});await expect(saveJournalEntry({id:ID,date:DAY,expectedRevision:1,body:"Draft"})).rejects.toBeInstanceOf(JournalConflictError);
    mock.rpc.mockResolvedValueOnce({data:{entry:null,replayed:true},error:null});expect(await saveJournalEntry({id:ID,date:DAY,expectedRevision:null,body:"Draft"})).toBeNull();
  });
  it("sends the previewed capture body to the ownership-checked atomic append RPC",async()=>{
    mock.rpc.mockResolvedValueOnce({data:{entry:row,source:{id:ID,user_id:ID,note_id:ID,entry_id:ID,entry_date:DAY,added_at:row.created_at},replayed:true},error:null});
    expect((await appendCaptureToJournal(ID,DAY,"A thought")).replayed).toBe(true);expect(mock.rpc).toHaveBeenCalledWith("append_capture_to_journal",{p_note_id:ID,p_date:DAY,p_expected_body:"A thought"});
  });
  it("loads paginated metadata without fetching journal body text for the index",async()=>{
    replies.push({data:[row],error:null},{data:[],error:null});const result=await fetchJournalIndex(ID);
    expect(result.dates[0]).toMatchObject<Partial<JournalEntrySummary>>({date:DAY,revision:3});expect(result.dates[0]).not.toHaveProperty("body");
    expect(calls.find(call=>call.table==="journal_entries"&&call.method==="select")?.args[0]).not.toContain("body");
  });
  it("validates calendar dates, keeps text boundaries clear, and excludes both journalled and task-linked captures from unsorted counts",()=>{
    expect(validJournalDate("2028-02-29")).toBe(true);expect(validJournalDate("2027-02-29")).toBe(false);expect(validJournalDate("2026-11-07T00:00Z")).toBe(false);
    expect(appendJournalBody("Existing","New note")).toBe("Existing\n\nNew note");expect(appendJournalBody("","New note")).toBe("New note");
    const note={id:ID,body:"Original",createdAt:"",updatedAt:""};expect(captureIsUnsorted(note,[])).toBe(true);
    expect(captureIsUnsorted(note,[{id:ID,noteId:ID,entryId:ID,date:DAY,addedAt:""}])).toBe(false);expect(captureIsUnsorted({...note,convertedAt:"earlier"},[])).toBe(false);
  });
});
