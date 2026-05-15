// E2E helper: create auth user -> create profile -> insert approved submission -> poll /api/choreos/feed
// Usage: set env SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BASE_URL(optional, defaults to http://localhost:3000), TEST_USER_ID(optional)

const fetch = global.fetch || require('node-fetch');

async function createAuthUser(supabaseUrl, serviceKey, userId) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      id: userId,
      email: `test-${userId.substring(0, 8)}@e2e.test`,
      password: 'E2E_Test_Password_123',
      email_confirm: true,
      user_metadata: { full_name: 'E2E Tester' },
    }),
  });
  // 422 = user already exists, which is fine
  if (res.status === 422) {
    console.log('Auth user already exists (OK)');
    return true;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create auth user failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function upsertProfile(supabaseUrl, serviceKey, userId) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles`;
  const body = [{ id: userId, full_name: 'E2E Tester', role: 'choreographer' }];
  const res = await fetch(`${url}?on_conflict=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Profile upsert failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function insertSubmission(supabaseUrl, serviceKey, submission) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/choreo_submissions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(submission),
  });
  if (!res.ok) throw new Error(`Insert submission failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return Array.isArray(json) ? json[0] : json;
}

async function pollForFeed(baseUrl, predicate, attempts = 20, intervalMs = 1000) {
  const feedUrl = `${baseUrl.replace(/\/$/, '')}/api/choreos/feed?limit=20`;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(feedUrl);
      if (!res.ok) {
        console.warn(`Feed fetch returned ${res.status}`);
      } else {
        const json = await res.json();
        const posts = json.posts || [];
        if (predicate(posts)) return { found: true, posts };
      }
    } catch (err) {
      console.warn('Feed fetch error:', err?.message || err);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { found: false };
}
// Cleanup helpers
async function deleteSubmission(supabaseUrl, serviceKey, id) {
  try {
    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/choreo_submissions?id=eq.${id}`;
    await fetch(url, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    console.log('Deleted submission', id);
  } catch (err) {
    console.warn('Failed to delete submission', id, err?.message || err);
  }
}

async function deleteProfile(supabaseUrl, serviceKey, id) {
  try {
    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${id}`;
    await fetch(url, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    console.log('Deleted profile', id);
  } catch (err) {
    console.warn('Failed to delete profile', id, err?.message || err);
  }
}

async function deleteAuthUser(supabaseUrl, serviceKey, id) {
  try {
    const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${id}`;
    await fetch(url, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    console.log('Deleted auth user', id);
  } catch (err) {
    console.warn('Failed to delete auth user', id, err?.message || err);
  }
}

(async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const TEST_USER_ID = process.env.TEST_USER_ID || '00000000-0000-4000-8000-000000000001';
  const DO_CLEANUP = (process.env.CLEANUP || 'true').toLowerCase() === 'true';

  let createdSubmissionId = null;

  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
      process.exit(2);
    }

    console.log('Creating auth user...', TEST_USER_ID);
    await createAuthUser(SUPABASE_URL, SERVICE_KEY, TEST_USER_ID);

    console.log('Upserting test profile...', TEST_USER_ID);
    await upsertProfile(SUPABASE_URL, SERVICE_KEY, TEST_USER_ID);

    const now = new Date().toISOString();
    const uniqueTitle = `E2E Test - ${now}`;
    const submission = {
      user_id: TEST_USER_ID,
      title: uniqueTitle,
      description: 'Automated E2E submission for feed smoke test',
      video_url: 'https://example.com/demo.mp4',
      style_slug: 'bollywood',
      difficulty: 'beginner',
      lesson_parts: [],
      hashtags: [],
      thumbnail_url: null,
      checklist_full_body_visible: true,
      checklist_stable_camera: true,
      checklist_good_lighting: true,
      checklist_passed: true,
      submission_status: 'approved',
      ai_status: 'completed',
      submitted_at: now,
      published_at: now,
      tier: 'community',
      engagement_score: 0,
      view_count: 0,
      like_count: 0,
    };

    console.log('Inserting approved submission:', uniqueTitle);
    const created = await insertSubmission(SUPABASE_URL, SERVICE_KEY, submission);
    createdSubmissionId = created.id;
    console.log('Inserted submission id:', createdSubmissionId);

    console.log('Polling app feed for published choreo...');
    const POLL_ATTEMPTS = Number(process.env.POLL_ATTEMPTS) || 30;
    const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 1500;
    const result = await pollForFeed(BASE_URL, (posts) => posts.some((p) => p.id === createdSubmissionId || p.title === uniqueTitle), POLL_ATTEMPTS, POLL_INTERVAL_MS);
    if (result.found) {
      console.log('SUCCESS: Published choreo found in feed.');
      process.exitCode = 0;
    } else {
      console.error('FAILED: Published choreo not found in feed after polling.');
      process.exitCode = 3;
    }
  } catch (err) {
    console.error('E2E script failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    if (DO_CLEANUP && createdSubmissionId) {
      console.log('Cleaning up created submission...');
      await deleteSubmission(SUPABASE_URL, SERVICE_KEY, createdSubmissionId);
    }
    if (DO_CLEANUP) {
      console.log('Removing test profile and auth user (if created)...');
      await deleteProfile(SUPABASE_URL, SERVICE_KEY, TEST_USER_ID);
      await deleteAuthUser(SUPABASE_URL, SERVICE_KEY, TEST_USER_ID);
    }
    process.exit(process.exitCode || 0);
  }
})();
