import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const work=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/push/worker',async importOriginal=>({...await importOriginal<typeof import('@/lib/push/worker')>(),deliverReminders:work}));
import { POST } from './route';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('PUSH_WORKER_SECRET','c'.repeat(64));});
afterEach(()=>vi.unstubAllEnvs());
describe('machine dispatch endpoint',()=>{
  it('rejects cookie-only and wrong bearer requests without claiming or sending',async()=>{
    for(const headers of [{cookie:'session=fake'}, {authorization:'Bearer wrong'}] as Record<string,string>[]){
      const response=await POST(new Request('https://lair.example/api/push/dispatch',{method:'POST',headers}));
      expect(response.status).toBe(401);expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(work).not.toHaveBeenCalled();
  });
  it('returns noncached delivery counts and sanitizes failures',async()=>{
    const request=()=>new Request('https://lair.example/api/push/dispatch',{method:'POST',headers:{authorization:`Bearer ${'c'.repeat(64)}`}});
    work.mockResolvedValueOnce({accepted:1,failed:0,expired:0,skipped:0});let response=await POST(request());expect(await response.json()).toMatchObject({accepted:1});
    work.mockRejectedValueOnce(new Error('private endpoint and credentials'));response=await POST(request());expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('credentials');
  });
});
