import { beforeEach,describe,expect,it,vi } from "vitest";
import { addDays } from "@/lib/dates";

const db=vi.hoisted(() => ({ calls:[] as {method:string;args:unknown[]}[],results:[] as {data:unknown;error:unknown}[] }));
vi.mock("@/lib/supabase/client",() => ({ createClient:() => ({
  from:(...args:unknown[]) => {
    db.calls.push({method:"from",args});
    const chain=Object.fromEntries(["select","insert","update","eq","order","range","single"].map((method) => [method,(...args:unknown[]) => { db.calls.push({method,args}); return chain; }])) as Record<string,unknown>;
    chain.then=(resolve:(r:unknown) => unknown) => Promise.resolve(db.results.shift()).then(resolve);
    return chain;
  },
  rpc:(...args:unknown[]) => { db.calls.push({method:"rpc",args}); return Promise.resolve(db.results.shift()); },
}) }));
import { buildHabitFields,createHabit,fetchHabits,habitFromRows,recordHabitProgress,updateHabit,type HabitInput,type HabitRow } from "./habits";
const USER="11111111-1111-4111-8111-111111111111",ID="22222222-2222-4222-8222-222222222222";
const input:HabitInput={name:"Water",description:"",frequency:"daily",targetPerWeek:7,trackingType:"quantity",dailyTarget:8,unit:"glasses",streakEnabled:true,color:"cyan"};
const row:HabitRow={id:ID,user_id:USER,name:"Water",description:"",frequency:"daily",target_per_week:7,is_active:true,tracking_type:"quantity",daily_target:8,unit:"glasses",streak_enabled:true,color:"cyan",created_at:"2026-01-01T12:00:00Z"};
const calls=(method:string) => db.calls.filter((c) => c.method === method).map((c) => c.args);
beforeEach(() => { db.calls=[]; db.results=[{data:row,error:null}]; });
describe("habit data access",() => {
  it("validates positive targets, units and weekly counts, and normalizes check-in defaults",() => {
    expect(buildHabitFields({...input,name:" Water ",description:"  "})).toMatchObject({name:"Water",description:"",daily_target:8,streak_enabled:true});
    expect(buildHabitFields({...input,trackingType:"check",dailyTarget:0,unit:""})).toMatchObject({daily_target:1,unit:"check-in"});
    for (const dailyTarget of [0,-1,NaN,Infinity,0.0001]) expect(() => buildHabitFields({...input,dailyTarget})).toThrow(/target/);
    expect(() => buildHabitFields({...input,frequency:"weekly",targetPerWeek:8})).toThrow(/1 and 7/);
  });
  it("maps completion from the saved log target instead of a changed daily goal",() => {
    const h=habitFromRows({...row,daily_target:10},[{habit_id:ID,completed_on:"2026-11-07",amount:8,target:8},{habit_id:ID,completed_on:"2026-11-06",amount:4,target:8}]);
    expect(h.checkIns).toEqual(["2026-11-07"]);
    expect(h.days["2026-11-06"].amount).toBe(4);
  });
  it("loads owner-scoped history past the API's first 1000 records",async () => {
    const logs=Array.from({length:1001},(_,i) => ({habit_id:ID,completed_on:addDays("2023-01-01",i),amount:1,target:1}));
    db.results=[{data:[row],error:null},{data:logs.slice(0,1000),error:null},{data:logs.slice(1000),error:null}];
    expect((await fetchHabits(USER))[0].checkIns).toHaveLength(1001);
    expect(calls("range")).toEqual([[0,999],[1000,1999]]);
    expect(calls("eq")).toEqual([["user_id",USER],["user_id",USER],["user_id",USER]]);
  });
  it("reports missing migration and failed history separately from an empty habit list",async () => {
    db.results=[{data:null,error:{code:"42703"}}];
    await expect(fetchHabits(USER)).rejects.toThrow(/migration/);
    db.results=[{data:[],error:null},{data:[],error:null}]; expect(await fetchHabits(USER)).toEqual([]);
    db.results=[{data:[row],error:null},{data:null,error:{message:"Failed to fetch"}}];
    await expect(fetchHabits(USER)).rejects.toThrow(/connection/);
  });
  it("creates with a stable UUID and verified owner and recovers an unchanged retry",async () => {
    await createHabit(USER,ID,input);
    expect(calls("insert")[0][0]).toMatchObject({id:ID,user_id:USER,description:"",streak_enabled:true});
    db.results=[{data:null,error:{code:"23505"}},{data:row,error:null}];
    expect((await createHabit(USER,ID,input)).id).toBe(ID);
  });
  it("edits streak preference and future targets without losing historical progress",async () => {
    const h=habitFromRows(row,[{habit_id:ID,completed_on:"2026-11-07",amount:8,target:8}]);
    db.results=[{data:{...row,streak_enabled:false,daily_target:10},error:null}];
    const saved=await updateHabit(USER,h,{...input,streakEnabled:false,dailyTarget:10});
    expect(saved.checkIns).toEqual(["2026-11-07"]); expect(saved.streakEnabled).toBe(false);
    expect(calls("eq")).toEqual([["id",ID],["user_id",USER]]);
    await expect(updateHabit(USER,h,{...input,unit:"mL"})).rejects.toThrow(/history/);
  });
  it("uses an atomic server-owned receipt ID and a plain calendar date for progress",async () => {
    const log={habit_id:ID,completed_on:"2026-11-07",amount:3,target:8}; db.results=[{data:{log},error:null}];
    expect(await recordHabitProgress({id:USER,habitId:ID,date:"2026-11-07",mode:"add",value:1})).toEqual(log);
    expect(calls("rpc")).toEqual([["record_habit_progress",{p_operation_id:USER,p_habit_id:ID,p_date:"2026-11-07",p_mode:"add",p_value:1}]]);
    expect(calls("insert")).toHaveLength(0);
  });
});
