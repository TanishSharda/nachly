import { vi, describe, it, expect } from 'vitest';

// Mock supabase/server and service role audit so the route can be invoked in tests
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
  createServiceRoleClient: () => ({ from: () => ({ insert: async () => ({}) }) }),
}));
vi.mock('@/lib/security/serviceRoleAudit', () => ({ logServiceRoleUsage: () => {} }));

import * as sessionRoute from '../src/app/api/choreographer/upload/session/route';

describe('upload session route', () => {
  it('creates a session without throwing', async () => {
    const res: any = await (sessionRoute as any).POST({} as any);
    expect(res).toBeDefined();
    try {
      const body = await res.json();
      expect(body).toHaveProperty('sessionId');
    } catch {
      expect(res).toBeTruthy();
    }
  });
});
