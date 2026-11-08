import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({client:vi.fn(),send:vi.fn(),configuration:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.client}));
vi.mock("./send",()=>({sendPush:mocks.send,pushConfiguration:mocks.configuration}));
import { deleteReminder, loadNotificationSettings, registerPushDevice, removePushDevice, saveNotificationPreferences, saveReminder, testPushDevice } from "./actions";
const USER="11111111-1111-4111-8111-111111111111",DEVICE="22222222-2222-4222-8222-222222222222";
let from:ReturnType<typeof vi.fn>,rpc:ReturnType<typeof vi.fn>,getUser:ReturnType<typeof vi.fn>;
let calls: {table:string;method:string;args:unknown[]}[];let replies:{data:unknown;error:unknown}[];
beforeEach(()=>{
  vi.clearAllMocks();calls=[];replies=[];
  from=vi.fn((table:string)=>{
    const chain:Record<string,unknown>={};
    for(const method of ['select','insert','update','delete','upsert','eq','single','maybeSingle'])chain[method]=(...args:unknown[])=>{calls.push({table,method,args});return chain;};
    chain.then=(resolve:(value:unknown)=>void)=>Promise.resolve(replies.shift()??{data:{id:DEVICE},error:null}).then(resolve);return chain;
  });
  rpc=vi.fn().mockResolvedValue({data:[],error:null});getUser=vi.fn().mockResolvedValue({data:{user:{id:USER}},error:null});
  mocks.client.mockResolvedValue({from,rpc,auth:{getUser}});mocks.send.mockResolvedValue('accepted');
});
describe('authenticated push actions',()=>{
  it('verifies the user before all database mutations and tests',async()=>{
    getUser.mockResolvedValue({data:{user:null},error:{message:'expired'}});
    for(const call of [()=>loadNotificationSettings(DEVICE),()=>removePushDevice(DEVICE),()=>testPushDevice(DEVICE,'https://web.push.apple.com/test'),()=>deleteReminder(DEVICE),()=>saveNotificationPreferences({paused:true,time_zone:'UTC',quiet_start:null,quiet_end:null})]){
      const result=await call();expect(result.ok).toBe(false);if(!result.ok)expect(result.error).toMatch(/Sign in/);
    }
    expect(from).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();expect(mocks.send).not.toHaveBeenCalled();
  });
  it('uses the verified owner on registration, never an ID from client input',async()=>{
    replies.push({data:null,error:null},{data:{id:DEVICE},error:null});
    const result=await registerPushDevice(DEVICE,{endpoint:'https://web.push.apple.com/test',keys:{p256dh:'B'.repeat(87),auth:'A'.repeat(22)}});
    expect(result.ok).toBe(true);expect(calls.find(c=>c.method==='insert')?.args[0]).toMatchObject({id:DEVICE,user_id:USER});
  });
  it('scopes updates and deletion by verified account and UUID',async()=>{
    expect((await removePushDevice(DEVICE)).ok).toBe(true);
    expect(calls).toContainEqual({table:'push_devices',method:'eq',args:['user_id',USER]});
    expect(calls).toContainEqual({table:'push_devices',method:'eq',args:['id',DEVICE]});
    await saveReminder(DEVICE,{task_id:DEVICE,habit_id:null,enabled:true,local_date:'2027-01-01',local_time:'09:00',time_zone:'UTC'});
    expect(calls).toContainEqual({table:'reminder_rules',method:'eq',args:['user_id',USER]});
    expect(calls.find(c=>c.table==='reminder_rules'&&c.method==='update')?.args[0]).not.toHaveProperty('task_id');
  });
  it('does not send when the owner/device claim fails',async()=>{
    expect((await testPushDevice(DEVICE,'https://web.push.apple.com/test')).ok).toBe(false);
    expect(rpc).toHaveBeenCalledWith('claim_push_test',{device:DEVICE,device_endpoint:'https://web.push.apple.com/test'});
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('cleans an expired subscription only for this owner and returns a recovery instruction',async()=>{
    rpc.mockResolvedValue({data:[{id:DEVICE,endpoint:'https://web.push.apple.com/test'}],error:null});mocks.send.mockResolvedValue('expired');
    const result=await testPushDevice(DEVICE,'https://web.push.apple.com/test');expect(result.ok).toBe(false);
    if(!result.ok)expect(result.error).toMatch(/expired/);
    expect(calls).toContainEqual({table:'push_devices',method:'eq',args:['user_id',USER]});
  });
  it('reports missing setup separately from an empty reminder list without leaking database errors',async()=>{
    replies.push({data:null,error:{code:'42P01',message:'private details'}});
    const result=await loadNotificationSettings(DEVICE);expect(result.ok).toBe(false);
    if(!result.ok){expect(result.error).toMatch(/migration 003/);expect(result.error).not.toMatch(/private details/);}
  });
  it('reuses an owned item reminder after an uncertain insert instead of creating a second rule',async()=>{
    replies.push({data:{id:DEVICE},error:null},{data:{id:DEVICE,task_id:USER},error:null});
    expect((await saveReminder(null,{task_id:USER,habit_id:null,enabled:true,local_date:'2027-01-01',local_time:'09:00',time_zone:'UTC'})).ok).toBe(true);
    expect(calls.filter(c=>c.method==='insert')).toHaveLength(0);
    expect(calls).toContainEqual({table:'reminder_rules',method:'eq',args:['user_id',USER]});
    expect(calls).toContainEqual({table:'reminder_rules',method:'eq',args:['task_id',USER]});
    expect(calls).toContainEqual({table:'reminder_rules',method:'eq',args:['id',DEVICE]});
  });
  it('recovers a concurrent insert using the unique owned item link',async()=>{
    replies.push({data:null,error:null},{data:null,error:{code:'23505'}},{data:{id:DEVICE},error:null},{data:{id:DEVICE},error:null});
    expect((await saveReminder(null,{task_id:USER,habit_id:null,enabled:true,local_date:'2027-01-01',local_time:'09:00',time_zone:'UTC'})).ok).toBe(true);
    expect(calls.filter(c=>c.method==='insert')).toHaveLength(1);
    expect(calls.filter(c=>c.method==='update')).toHaveLength(1);
  });
});
