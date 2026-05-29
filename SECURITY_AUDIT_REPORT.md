# Security Audit & Remediation — Phase 3

Date: 2026-05-29

Summary
- Completed a repo-wide hardening focused on Supabase service-role usage, upload flows, rate-limits, and CI checks.
- Added audit logging for privileged `createServiceRoleClient()` usage and guarded server-only storage helpers.
- Implemented an optional remote audit sink via `SERVICE_ROLE_REMOTE_LOG_URL`.

What changed (high level)
- `src/lib/security/serviceRoleAudit.ts`: async logger, writes to `service-role-audit.log`, optional POST to remote URL.
- `src/lib/supabase/server.ts`: now emits an audit entry when `createServiceRoleClient()` is invoked.
- `src/lib/supabase/storage.ts`: runtime guards to prevent client-side `.upload()` usage.
- Multiple API routes updated to call `logServiceRoleUsage()` with contextual details (user id, path, bucket, order id).
- Rate limiter upgraded to support Redis (already in repo) and endpoints updated to `await enforceRateLimit()`.
- Added `scripts/check-service-role-usage.js` and `npm run check:service-role` to enumerate service-role call sites for review.

Recommended next steps (for reviewers / ops)
1. Configure remote audit sink:
   - Set `SERVICE_ROLE_REMOTE_LOG_URL` and optional `SERVICE_ROLE_REMOTE_LOG_TOKEN` in staging and production.
2. Make `scripts/check-service-role-usage.js` a CI gating check that fails unless reviewed/approved.
   - The repository already includes `.github/workflows/security-audit.yml` which runs `npm run check:service-role` and `npm run security:audit` on PRs; the checker will fail the job if any `createServiceRoleClient` occurrences are present.
3. Consider shipping audit entries to a centralized log (Datadog, CloudWatch, or Upstash) rather than a local file.
4. Enable Redis for the rate limiter in production (`RATE_LIMIT_REDIS_URL`) or use Upstash REST for serverless.
5. Create a PR from these changes and set the new audit/CI checks as required for merging.

Suggested PR body
- Title: "security(hardening): audit service-role usage, server-only storage guards, rate-limiter upgrades"
- Body: Summarize changes above and reference required env vars and roll-out instructions.

Files touched (representative)
- src/lib/security/serviceRoleAudit.ts
- src/lib/supabase/server.ts
- src/lib/supabase/storage.ts
- src/lib/supabase/queries/choreos.ts
- src/app/api/* (several routes updated)
- scripts/check-service-role-usage.js
- package.json (script added)

Notes
- All changes preserve existing behavior for properly configured servers; test-only routes remain gated by `NODE_ENV`/`ENABLE_TEST_API`.
- The audit file `service-role-audit.log` will be created in the process CWD; rotate or ship it in production.
