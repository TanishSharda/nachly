# Naachly
Naachly is a Next.js dance learning platform with AI-assisted practice flows, drill progression, replay tooling, and Supabase-backed auth/data.

## Quick Start
1. Install dependencies.

```bash
npm install
```

2. Copy environment template.

```bash
copy .env.example .env.local
```

3. Fill required variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DRILL_SIGNING_SECRET`

4. Start development server.

```bash
npm run dev
```

App runs on `http://localhost:3000`.

## Environment Notes

- Supabase variables are required for auth, drill APIs, and feedback persistence.
- Firebase variables are only required for Firebase-backed routes (for example reels/learn/record/replay).
- Do not commit secrets to source control.

## Supabase Migrations

SQL migrations are in `supabase/migrations`.

To run one migration through the helper script:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "<personal-access-token>"
$env:SUPABASE_PROJECT_REF = "<project-ref>"
.\.tmp-run-migration.ps1 -MigrationFile "supabase/migrations/001_initial_schema.sql"
Get-Content .tmp-migration-result.txt
```

## Tests

Run E2E tests:

```bash
npm run test:e2e
```

If you need a specific base URL:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3001'
npm run test:e2e -- tests/e2e/core-flows.spec.ts
```

## Build

Default local build (stable on current Windows setup):

```bash
npm run build
```

Full Next.js static-generation build (stricter path):

```bash
npm run build:full
```

If `build:full` fails locally with worker memory/spawn issues on Windows, use `build` for local verification and run `build:full` in CI/Linux where possible.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
