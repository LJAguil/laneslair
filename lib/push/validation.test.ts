import { describe, expect, it } from "vitest";
import { safePushEndpoint, validatePreferences, validateReminder, validateSubscription } from "./validation";
import { workerAuthorized } from "./worker";

describe("untrusted push inputs",()=>{
  it("only accepts HTTPS endpoints on recognized push providers, blocking SSRF and redirects to arbitrary hosts",()=>{
    for(const endpoint of ["https://web.push.apple.com/abc","https://fcm.googleapis.com/fcm/send/abc","https://updates.push.services.mozilla.com/wpush/v2/abc","https://wns2-db5p.notify.windows.com/abc"])expect(safePushEndpoint(endpoint)).toBe(endpoint);
    for(const endpoint of ["http://web.push.apple.com/abc","https://127.0.0.1/", "https://example.com/", "https://push.apple.com.attacker.com/", "https://web.push.apple.com:8443/", "https://user:password@web.push.apple.com/", "https://web.push.apple.com/#bad"])expect(()=>safePushEndpoint(endpoint)).toThrow();
  });
  it("validates encryption keys and expires outdated subscriptions",()=>{
    const subscription={endpoint:"https://web.push.apple.com/test",keys:{p256dh:"B".repeat(87),auth:"A".repeat(22)}};
    expect(()=>validateSubscription(subscription)).not.toThrow();
    expect(()=>validateSubscription({...subscription,expirationTime:Date.now()-1})).toThrow(/expired/);
    expect(()=>validateSubscription({...subscription,keys:{...subscription.keys,auth:"bad"}})).toThrow(/Invalid/);
  });
  it("requires explicit task date/time rather than accepting the due-date workaround",()=>{
    const rule={task_id:"11111111-1111-4111-8111-111111111111",habit_id:null,local_date:"2027-01-12",local_time:"09:00",time_zone:"America/Chicago",enabled:true};
    expect(()=>validateReminder(rule)).not.toThrow();
    expect(()=>validateReminder({...rule,local_date:null})).toThrow(/date/);
    expect(()=>validateReminder({...rule,local_date:"2027-02-30"})).toThrow(/date/);
    expect(()=>validateReminder({...rule,local_time:""})).toThrow(/time/);
    expect(()=>validateReminder({...rule,time_zone:"Moon/Lair"})).toThrow(/zone/);
  });
  it("requires a valid quiet-hours pair",()=>{
    expect(()=>validatePreferences({paused:false,time_zone:"UTC",quiet_start:"22:00",quiet_end:null})).toThrow(/both/);
    expect(()=>validatePreferences({paused:false,time_zone:"UTC",quiet_start:"22:00",quiet_end:"22:00"})).toThrow(/different/);
    expect(()=>validatePreferences({paused:true,time_zone:"UTC",quiet_start:"22:00",quiet_end:"08:00"})).not.toThrow();
  });
  it("refuses unset, short, wrong and cookie-like scheduler credentials",()=>{
    const secret="b".repeat(64);
    expect(workerAuthorized(`Bearer ${secret}`,secret)).toBe(true);
    for(const header of [null,"Bearer wrong",secret,`Cookie ${secret}`])expect(workerAuthorized(header,secret)).toBe(false);
    expect(workerAuthorized("Bearer unset",undefined)).toBe(false);
    expect(workerAuthorized("Bearer short","short")).toBe(false);
  });
});
