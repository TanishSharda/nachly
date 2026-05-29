Security hardening checklist — Nachly

This checklist summarizes immediate actions and a prioritized remediation plan for server/client security.

1) Disable test-only/unsafe routes in production
- Ensure any route under `src/app/api/test` is gated by `NODE_ENV === 'development'` or `ENABLE_TEST_API=1`.
- Already applied to: `src/app/api/test/create-user/route.ts`, `src/app/api/test/create-published-submission/route.ts`.

2) Service-role usage audit
- Verify `createServiceRoleClient()` is used only in server-side API routes or scripts (`src/app/api`, `src/lib`, `scripts`, `src/app/admin`).
- Ensure routes that perform DB writes using service-role validate the authenticated user via `createServerSupabase()` and `supabase.auth.getUser()` when appropriate.

3) Signed upload flow
- Client must not call Supabase storage `.upload()` directly with anon key. Use `/api/storage/signed-upload-url` + `PUT` + `/api/storage/signed-url` for published or private objects.

4) Rate limiting & abuse protection
- Add rate-limits for write-heavy endpoints: purchases/webhooks, choreo submissions, practice-sessions, marketing leads.
- Consider per-IP and per-user limits, short time windows, and exponential backoff.

5) Logging & secrets
- Do not log service-role keys or secrets. Ensure `.env.example` lists required secrets but not values.
- Rotate service-role key after any suspected exposure.

6) CI enforcement
- Add `npm run security:audit` to CI (fail build if audit fails).

7) Smoke tests
- Add automated tests to ensure `/api/test/*` endpoints are protected by env guards.

8) Follow-ups (Medium-term)
- Harden webhooks (verify payload signature, idempotency).
- Add strict CORS if any endpoints are cross-origin.
- Add monitoring/alerts for suspicious API usage.

Recommended next steps:
- Run the included `scripts/security-audit.js` and wire into CI as `npm run security:audit`.
- Manually review any files reported by the audit and add auth checks where necessary.
