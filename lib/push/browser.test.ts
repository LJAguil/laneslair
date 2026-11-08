import { readFileSync } from "node:fs";
import vm from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceId, pushSupport } from "./browser";
afterEach(()=>vi.unstubAllGlobals());
describe('browser support and push-only service worker (simulated)',()=>{
  it('explains iPhone Home Screen installation without requesting permission',()=>{
    const permission=vi.fn();
    vi.stubGlobal('navigator',{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:1});
    vi.stubGlobal('window',{isSecureContext:true,Notification:{requestPermission:permission},matchMedia:()=>({matches:false})});
    expect(pushSupport()).toMatch(/Add to Home Screen/);expect(permission).not.toHaveBeenCalled();
  });
  it('handles unsupported browsers and blocked device storage clearly',()=>{
    vi.stubGlobal('navigator',{userAgent:'',platform:'',maxTouchPoints:0});
    vi.stubGlobal('window',{isSecureContext:true,matchMedia:()=>({matches:false})});
    expect(pushSupport()).toMatch(/doesn’t support/);
    vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('blocked');}});expect(()=>deviceId()).toThrow(/storage/);
  });
  it('never caches or fetches private data and ignores untrusted message text and URLs',async()=>{
    const handlers:Record<string,(event:unknown)=>void>={};const show=vi.fn().mockResolvedValue(undefined),open=vi.fn().mockResolvedValue(undefined);
    const self={addEventListener:(name:string,handler:(event:unknown)=>void)=>{handlers[name]=handler;},registration:{showNotification:show},location:{origin:'https://lair.example'},clients:{matchAll:async()=>[],openWindow:open}};
    vm.runInNewContext(readFileSync(new URL('../../public/sw.js',import.meta.url),'utf8'),{self,URL});
    expect(Object.keys(handlers).sort()).toEqual(['notificationclick','push']);
    let wait:Promise<unknown>=Promise.resolve();
    handlers.push({data:{json:()=>({kind:'task',body:'SECRET TASK TITLE',url:'https://attacker.example',tag:'receipt-1'})},waitUntil:(promise:Promise<unknown>)=>{wait=promise;}});await wait;
    expect(show).toHaveBeenCalledWith('Lane’s Lair',expect.objectContaining({body:'You have a reminder waiting in your Lair.',tag:'receipt-1',data:{url:'/tasks'}}));
    expect(JSON.stringify(show.mock.calls)).not.toContain('SECRET');
    handlers.notificationclick({notification:{close:vi.fn(),data:{url:'https://attacker.example'}},waitUntil:(promise:Promise<unknown>)=>{wait=promise;}});await wait;
    expect(open).toHaveBeenCalledWith('https://lair.example/');
  });
});
