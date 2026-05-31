Title: security(hardening): phase 3 — service-role audit, server-only storage guards, rate-limiter + CI

Summary:
- Adds service-role audit logging and optional remote sink (`SERVICE_ROLE_REMOTE_LOG_URL`).
- Adds runtime guards to server-only storage helpers and migrates upload flow to signed URLs for clients.
- Upgrades rate limiter with optional Redis backend and enforces `await enforceRateLimit()` in write endpoints.
- Adds `scripts/check-service-role-usage.js` and an allowlist `.service-role-allowed.json` for tracked, reviewed usages.
- Adds CI enforcement: `.github/workflows/security-audit.yml` runs the checker and `security:audit` on PRs.
- Creates `SECURITY_AUDIT_REPORT.md` summarizing changes and rollout steps.

Files changed:
- src/lib/security/serviceRoleAudit.ts
- src/lib/supabase/server.ts
- src/lib/supabase/storage.ts
- src/lib/supabase/queries/*
- src/app/api/* (multiple routes)
- scripts/check-service-role-usage.js
- .service-role-allowed.json
- SECURITY_AUDIT_REPORT.md
- .github/workflows/security-audit.yml

Notes for reviewers:
- Review `.service-role-allowed.json` entries and remove any that should no longer be allowed.
- Configure `SERVICE_ROLE_REMOTE_LOG_URL` in staging to forward audit logs to a secure sink.
- Ensure `RATE_LIMIT_REDIS_URL` or another persistent backend is available in production.

Suggested reviewers and labels
- Reviewers: `alice`, `bob`, `security-team` (replace with actual GitHub handles)
- Labels: `security`, `ci`, `audit`, `high-priority`

How to test locally:
1. Install deps: `npm ci`
2. Run the service-role checker: `npm run check:service-role` (should exit 0 if allowlisted)
3. Run the security audit: `npm run security:audit`
4. Start the app and test upload flows (signed URL endpoints) and admin pages.

PR link: https://github.com/TanishSharda/nachly/pull/new/security/hardening-phase3
