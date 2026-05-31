## Summary

Provide a short summary of the change and why it is needed.

---

## Security / Allowlist Governance

- This PR touches or may touch service-role usage and the allowlist.
- If this PR modifies `.service-role-allowed.json`, ensure the change is approved by a security reviewer and add the `service-role-allowlist` label to the PR.
- The repository includes an automated guard that will fail the PR checks if the allowlist file is changed without that label.

## Testing

- Describe manual or automated steps to verify behavior in staging.

## Deployment notes

- Required env vars: `SERVICE_ROLE_REMOTE_LOG_URL`, `RATE_LIMIT_REDIS_URL` (if enabling Redis), `SUPABASE_SERVICE_ROLE_KEY` must NOT be exposed to clients.

## Reviewers & Labels

- Suggested reviewers: backend, devops, security
- Suggested labels: `security`, `ci`, `audit`
