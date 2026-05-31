# Nachly Infrastructure Notes

This document summarizes production infrastructure recommendations for Nachly: deployment, CDN, backups, monitoring, autoscaling, and video delivery.

## Production Deployment Architecture

- Hosting: Vercel (Next.js App Router optimized for Edge/Serverless). Use a production team/org project and separate staging/prod projects.
- Build: Use `npx next build --experimental-build-mode=compile` in CI to produce an optimized server build. Cache `node_modules` and `.next` between CI runs where possible.
- Environment: Keep secrets in Vercel Environment Variables and restrict access via team roles. Do not commit service role keys to the repo.
- Runtime: Prefer Edge Functions for read-heavy public endpoints (feed, marketing), Serverless Functions for authenticated write paths requiring service-role DB clients.

## CDN & Caching (Vercel)

- Use Vercel's CDN for static assets and optimized caching layers. Configure `Cache-Control` headers on API responses where safe:
  - Feed endpoints: `Cache-Control: public, s-maxage=30` (short CDN cache)
  - Static public assets: long `s-maxage` + immutable fingerprinting
- Use `stale-while-revalidate` for non-critical pages where UX benefit outweighs slightly stale data.
- Configure custom CDN rules on Vercel for video origin if using a dedicated video CDN (Cloudflare Stream, Bunny, etc.).

## Database Backup & Migrations

- Primary DB: Supabase/Postgres. Follow these practices:
  - Automated nightly backups retained for 30 days (or longer depending on RPO/RTO).
  - Logical backups (pg_dump) plus physical backups (PITR) if supported.
  - Test restore process quarterly.
- Migrations: Keep SQL migrations in `supabase/migrations/`; CI should run `supabase db push` or equivalent in staging, and a manual/controlled promotion to production.
- Indexing: Provide recommended indexes as migration files (example below). Coordinate with DBAs for large tables.

Recommended indexes (examples):

```sql
-- speed up feed queries by created_at
CREATE INDEX IF NOT EXISTS idx_choreos_created_at ON routines (created_at DESC);

-- speed up lookups by creator
CREATE INDEX IF NOT EXISTS idx_choreos_creator ON routines (creator_id);

-- submissions by choreography
CREATE INDEX IF NOT EXISTS idx_submissions_choreo ON choreo_submissions (choreography_id);
```

## Monitoring & Alerting

- Metrics: Collect request latency, error rates (4xx/5xx), CPU/memory for server functions, and DB query times. Use Prometheus-compatible metrics or managed solutions (Datadog, New Relic).
- Logs: Centralize logs (Vercel + external aggregator). Capture structured logs from server functions and supabase errors.
- Alerts: Create alerting rules for:
  - Spike in 5xx rate (>1% sustained)
  - Increased median latency (API >200–300ms)
  - DB replication lag or high connection counts
  - Failed scheduled backups
- Uptime & SLOs: Define SLOs (e.g., 99.9% for public feed), and use synthetic E2E checks (Playwright) for critical flows (login, feed load, upload flow).

## Auto-scaling & Capacity Planning

- Keep serverless functions stateless and idempotent. Use concurrency limits for long-running jobs.
- For resource-heavy processing (video transcoding), use a separate worker pool (Cloud Run, ECS, or serverful VMs) with autoscaling based on queue depth (e.g., Redis or Pub/Sub).
- Configure DB connection pooling (PgBouncer or Supabase pooling) to avoid exhausting DB connections from serverless bursts.

## Video CDN Delivery Pipeline

- For uploaded videos, don't serve raw Supabase storage URLs directly at scale. Use a dedicated video CDN or streaming service:
  - Option A: Use Cloudflare Stream or Bunny Stream for transcoding, HLS generation, and global CDN.
  - Option B: Use an object store + CDN + on-the-fly transmuxing/transcoding workers.
- Upload flow suggestions:
  - Client uploads to signed URL (short-lived) -> store raw file in private bucket -> enqueue a job for transcoding to HLS + thumbnails -> publish processed artifacts to public bucket with CDN.
  - For files >50MB: use chunked uploads with MD5 checks and resumable strategy.
- Security: Serve signed URLs for private content and short-lived tokens for downloads where required.

## Operational Runbook (short)

- On high 5xx rates: check API logs -> identify recent deploys -> rollback if needed.
- On failed upload processing: inspect worker queue and requeue failed jobs, check transcoder logs.
- On DB restore: follow documented restore steps and run smoke tests against staging.

## Appendix / Links
- CI: include commands used in verification: `npx tsc --noEmit`, `npx next build --experimental-build-mode=compile`, `npm run lint`.
- Add links to the team's monitoring dashboards, incident runbooks, and DBA contacts here.

---

If you'd like, I can also generate a concrete migration file with the recommended indexes and a sample `cloud-worker` dispatch flow for video transcoding.
