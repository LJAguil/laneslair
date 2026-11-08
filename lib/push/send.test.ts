import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const transport=vi.hoisted(()=>vi.fn());
vi.mock('web-push',()=>({sendNotification:transport}));
import { pushConfiguration, sendPush } from './send';
const device={id:'test-device',endpoint:'https://web.push.apple.com/test',p256dh:'B'.repeat(87),auth:'A'.repeat(22),expires_at:null};
beforeEach(()=>{
  vi.clearAllMocks();vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY','test-public-key');vi.stubEnv('VAPID_PRIVATE_KEY','test-private-key');vi.stubEnv('VAPID_SUBJECT','mailto:test@example.com');
  transport.mockResolvedValue({statusCode:201});
});
afterEach(()=>vi.unstubAllEnvs());
describe('encrypted push transport (mocked provider)',()=>{
  it('uses server-side VAPID and a generic payload without task content',async()=>{
    expect(await sendPush(device,'task','receipt-id')).toBe('accepted');
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({endpoint:device.endpoint}),JSON.stringify({kind:'task',tag:'receipt-id'}),expect.objectContaining({TTL:300,timeout:8000,vapidDetails:{subject:'mailto:test@example.com',publicKey:'test-public-key',privateKey:'test-private-key'}}));
  });
  it('rejects arbitrary URLs before making a network call',async()=>{
    await expect(sendPush({...device,endpoint:'https://127.0.0.1/private'},'test','test')).rejects.toThrow(/provider/);expect(transport).not.toHaveBeenCalled();
  });
  it('maps provider expiry and transient failures without returning sensitive provider error details',async()=>{
    for(const statusCode of [404,410]){transport.mockRejectedValueOnce({statusCode,body:'private subscription details'});expect(await sendPush(device,'test','test')).toBe('expired');}
    transport.mockRejectedValueOnce({statusCode:503,body:'private subscription details'});expect(await sendPush(device,'test','test')).toBe('failed');
  });
  it('does not send with missing configuration or a known expired subscription',async()=>{
    expect(await sendPush({...device,expires_at:'2000-01-01T00:00:00Z'},'test','test')).toBe('expired');expect(transport).not.toHaveBeenCalled();
    vi.stubEnv('VAPID_PRIVATE_KEY','');expect(()=>pushConfiguration()).toThrow(/VAPID settings/);
  });
});
