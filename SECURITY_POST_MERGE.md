Post-merge Security Checklist
=============================

Purpose: concise steps to validate and maintain security posture after merging Phase 3 changes.

Immediate (run now)
- Revoke exposed tokens: ensure any accidentally leaked PATs are revoked and replaced.
- Run local checks:
  - `npm run security:audit`
  - `node scripts/check-service-role-usage.js`
  - `node scripts/test-remote-audit.js` (point at staging `SERVICE_ROLE_REMOTE_LOG_URL`)
- Verify `service-role-audit` ingestion: check remote sink for test event.
- Confirm rate-limiter backend: set `RATE_LIMIT_REDIS_URL` in staging and run integration test.

Configuration
- Set env vars in staging/prod:
  - `SERVICE_ROLE_REMOTE_LOG_URL` (required)
  - `SERVICE_ROLE_REMOTE_LOG_TOKEN` (optional)
  - `RATE_LIMIT_REDIS_URL` (optional but recommended for high-throughput endpoints)
- Ensure CI has secrets: `GH_TOKEN` for any label automation, `RATE_LIMIT_REDIS_URL` only if CI tests integration.

Monitoring & Alerting
- Create an alert for missing audit events: if `service-role` usage expected but no log lines in 24h, page on-call.
- Create an alert for high-rate errors from storage signed URLs: elevated 5xx / rate-limit spikes.
- Add log retention and export: export `service-role` audit to a central SIEM or AWS S3 daily.

Operational
- Run weekly security smoke:
  - `npm run security:audit`
  - `node scripts/check-service-role-usage.js`
  - Confirm remote sink ingestion via `scripts/test-remote-audit.js`
- Quarterly: rotate service tokens and review `.service-role-allowed.json` entries.

Post-incident
- Revoke affected keys immediately, rotate, and run the full audit checklist.
- Search commit history for accidental commits containing secrets, and rotate any found.

Optional (enable later)
- Apply branch protection for `main` requiring `security-audit` status and CODEOWNERS review.

How to apply branch protection (manual)
- Ensure you have a token with repo admin rights and SAML authorization for the org.
- Run locally (PowerShell):
  ```powershell
  $env:GITHUB_TOKEN = 'YOUR_ADMIN_TOKEN'
  node scripts\apply-branch-protection.js yourorg/yourrepo main
  ```

Or set `GITHUB_REPO` and run without args:
```powershell
$env:GITHUB_TOKEN='YOUR_ADMIN_TOKEN'; $env:GITHUB_REPO='yourorg/yourrepo'; node scripts\apply-branch-protection.js
```

Notes
- The script will set `required_status_checks` to include the `security-audit` check, enable `enforce_admins`, and require code-owner reviews.
- If your token lacks admin rights or SAML approval, the API will return 403; use the GitHub UI or an approved admin token.
- Review the `scripts/apply-branch-protection.js` before running.
