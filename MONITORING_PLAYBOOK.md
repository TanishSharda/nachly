Monitoring Playbook — Service-Role Audit & Uploads
=================================================

Purpose: quick runbook for detecting, alerting, and responding to issues involving service-role usage and storage uploads.

Key signals
- Missing audit logs: `service-role` expected activity but zero audit entries in 24h.
- High error rate: spikes of 5xx or rate-limit responses from signed-URL endpoints.
- Unexpected service-role client creation: any new `createServiceRoleClient()` occurrence detected by CI checker.

Dashboards to create
- `ServiceRole Usage`: counts per endpoint, per deploy, with top callers and recent notes.
- `Signed URL Errors`: 5xx / 4xx trends, top filenames, client IPs.
- `Rate-limit Events`: per-endpoint throttles, redis queue metrics.

Alerts (suggested)
- P1: Missing audit entries for 24h — page on-call.
- P1: Unauthorized service-role client usage reported by CI — block deploy and notify security owner.
- P2: 5xx > 1% over 10m on signed URL endpoints — create incident and investigate.

Playbook steps (on alert)
1. Triage: collect recent logs, last deploy SHA, and `service-role-audit` entries.
2. Identify caller: use `note` and `caller` fields from audit logs to find origin.
3. Contain: if a key is compromised, revoke and rotate immediately; disable impacted endpoints (feature-flag or remove service-role usage).
4. Remediate: patch code (remove client-side privileged actions), update allowlist, and update CI if needed.
5. Postmortem: document root cause, time to detect/contain, and action items.

Commands & checks
- Run local checks:
  ```powershell
  npm run security:audit
  node scripts/check-service-role-usage.js
  node scripts/test-remote-audit.js
  ```
- Tail local audit file (if in use):
  ```powershell
  Get-Content service-role-audit.log -Tail 100
  ```

On-call contacts
- Security owner: (add team contact here)
- SRE/infra: (add contact)

Maintenance
- Weekly: verify CI runs and that `scripts/check-service-role-usage.js` passes on `main`.
- Monthly: test remote sink ingestion and rotate any short-lived tokens.
