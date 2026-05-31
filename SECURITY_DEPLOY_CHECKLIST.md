# Security Deploy Checklist

This checklist covers configuration and operational steps to safely deploy the Phase 3 security hardening changes.

Pre-deploy (staging)
- [ ] Set `SERVICE_ROLE_REMOTE_LOG_URL` to a secure, private HTTP endpoint (Upstash, Logflare, Datadog intake, or similar).
- [ ] Set `SERVICE_ROLE_REMOTE_LOG_TOKEN` (bearer token) for the remote sink.
- [ ] Configure `RATE_LIMIT_REDIS_URL` (or Upstash REST) for the rate limiter.
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is present only in server/staging environments and never in client builds.
- [ ] Run `npm run check:service-role` locally and in CI — should pass (allowlist covers expected usages).
- [ ] Run `npm run security:audit` and address any findings.

Deployment
- [ ] Deploy to a staging environment with the above env vars set.
- [ ] Smoke test: upload flow (signed-upload URL), admin pages, webhooks, and subscription/purchase flows.
- [ ] Validate remote audit sink receives entries (use `scripts/test-remote-audit.js`).
- [ ] Confirm rate-limiter behavior under load in staging (simulate concurrent requests).

Post-deploy (production)
- [ ] Set the same env vars in production and ensure secrets are stored in the platform secret store.
- [ ] Enable GitHub branch protection rules on `main`: require passing checks and required reviewers.
- [ ] Monitor `service-role-audit.log` and remote sink for unexpected entries for 48-72 hours.
- [ ] Rotate any keys if suspicious activity is detected.

Notes
- If you use a managed logging sink, ensure data retention and access controls are configured.
