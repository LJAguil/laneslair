import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({client:vi.fn(),user:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createClient:mock.client}));
vi.mock("./tasks",async original=>({...await original<typeof import("./tasks")>(),getVerifiedUserId:mock.user}));
import { fetchStatistics } from "./statistics";
import { statisticsRange } from "@/lib/statistics";
let calls:{table:string;method:string;args:unknown[]}[],replies:Record<string,{data:unknown;error:unknown}[]>;
beforeEach(()=>{
  vi.clearAllMocks();calls=[];replies={};mock.user.mockResolvedValue("verified-owner");
  mock.client.mockReturnValue({from:(table:string)=>{
    const chain:Record<string,unknown>={};for(const method of ["select","eq","gte","lte","lt","order","range"])chain[method]=(...args:unknown[])=>{calls.push({table,method,args});return chain;};
    chain.then=(resolve:(value:unknown)=>void)=>Promise.resolve(replies[table]?.shift()??{data:[],error:null}).then(resolve);return chain;
  }});
});
describe("owned Statistics metadata reads",()=>{
  it("scopes every source to the verified owner and never fetches journal/task text",async()=>{
    await fetchStatistics(statisticsRange("2026-11-08",30));for(const table of ["tasks","habits","habit_logs","journal_entries"])expect(calls).toContainEqual({table,method:"eq",args:["user_id","verified-owner"]});
    for(const call of calls.filter(call=>call.method==="select"))expect(String(call.args[0])).not.toMatch(/body|description|notes|\*/);
    expect(calls).toContainEqual({table:"tasks",method:"eq",args:["status","done"]});expect(calls.some(call=>call.table==="tasks"&&call.method==="lt"&&call.args[0]==="completed_at")).toBe(true);
  });
  it("fails before any queries if the account cannot be verified",async()=>{
    mock.user.mockRejectedValueOnce(new Error("expired"));await expect(fetchStatistics(statisticsRange("2026-11-08",7))).rejects.toThrow("expired");expect(mock.client).not.toHaveBeenCalled();
  });
  it("keeps a failed source separate while successful empty sources remain genuine empty results",async()=>{
    replies.journal_entries=[{data:null,error:{code:"42P01"}}];const result=await fetchStatistics(statisticsRange("2026-11-08",7));expect(result.journal.status).toBe("error");expect(result.tasks).toEqual({status:"ready",data:[]});expect(result.habits.status).toBe("ready");
  });
  it("paginates past the default row limit and retains archived habits",async()=>{
    replies.habits=[{data:Array.from({length:1000},(_,id)=>({id:String(id),name:"Habit",unit:"glasses",tracking_type:"quantity",is_active:false})),error:null},{data:[{id:"1000",name:"Last",unit:"mL",tracking_type:"quantity",is_active:true}],error:null}];
    const result=await fetchStatistics(statisticsRange("2026-11-08",90));expect(result.habits.status).toBe("ready");if(result.habits.status==="ready")expect(result.habits.data.habits).toHaveLength(1001);
    expect(calls).toContainEqual({table:"habits",method:"range",args:[1000,1999]});expect(calls.some(call=>call.method==="eq"&&call.args[0]==="is_active")).toBe(false);
  });
  it("does not guess units for a record whose habit disappeared during the read",async()=>{
    replies.habit_logs=[{data:[{habit_id:"missing",completed_on:"2026-11-08",amount:1,target:1}],error:null}];const result=await fetchStatistics(statisticsRange("2026-11-08",7));expect(result.habits.status).toBe("error");
  });
});
