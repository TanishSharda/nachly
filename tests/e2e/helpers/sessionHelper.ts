import { Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export async function signInViaApi(page: Page, opts?: { email?: string; password?: string }) {
  const email = opts?.email || `e2e+${Date.now()}@example.com`
  const password = opts?.password || 'TestPass123!'

  // Determine base origin. Prefer explicit PLAYWRIGHT_BASE_URL, fallback to localhost.
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'

  // Create test user via app runtime test API
  const createRes = await page.request.post(`${base}/api/test/create-user`, {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email, password }),
  })
  if (createRes.status() < 200 || createRes.status() >= 300) {
    const body = await createRes.text().catch(() => '')
    throw new Error(`create-user failed: ${createRes.status()} ${body}`)
  }

  // Exchange credentials for access/refresh tokens via Supabase auth
  // Ensure public Supabase envs are available to the test process. If not present,
  // attempt to load them from a local `.env.local` file (used in development).
  let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  let SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    try {
      const envPath = path.resolve(process.cwd(), '.env.local')
      if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, 'utf8')
        for (const line of raw.split(/\r?\n/)) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
          if (!m) continue
          const [, key, val] = m
          const clean = val.replace(/^\"|\"$/g, '')
          if (!process.env[key]) process.env[key] = clean
        }
        SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
        SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    } catch (err) {
      /* ignore */
    }
  }
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error('Missing Supabase env vars for signing in')
  }

  const tokenRes = await page.request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
    },
    data: JSON.stringify({ email, password }),
  })

  if (tokenRes.status() < 200 || tokenRes.status() >= 300) {
    const body = await tokenRes.text().catch(() => '')
    throw new Error(`supabase token failed: ${tokenRes.status()} ${body}`)
  }

  const tokenJson = await tokenRes.json()
  const access_token = tokenJson.access_token
  const refresh_token = tokenJson.refresh_token
  const expires_at = tokenJson.expires_at
  if (!access_token) throw new Error('no access_token from supabase')

  // Persist session through the app endpoint so cookie attributes match runtime expectations.
  const sessionRes = await page.request.post(`${base}/api/auth/session`, {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ access_token, refresh_token, expires_at }),
  })
  if (sessionRes.status() < 200 || sessionRes.status() >= 300) {
    const body = await sessionRes.text().catch(() => '')
    throw new Error(`session bootstrap failed: ${sessionRes.status()} ${body}`)
  }

  const cookieSnapshot = await page.context().cookies(base)
  const hasAccessCookie = cookieSnapshot.some((c) => c.name === 'sb-access-token')
  if (!hasAccessCookie) {
    // Some local setups do not propagate Set-Cookie from API request context.
    // Fall back to direct context cookies so server-side routes still receive auth.
    const hostname = new URL(base).hostname
    const cookiesToAdd: any[] = [
      {
        name: 'sb-access-token',
        value: access_token,
        domain: hostname,
        path: '/',
        httpOnly: true,
        secure: false,
      },
    ]
    if (refresh_token) {
      cookiesToAdd.push({
        name: 'sb-refresh-token',
        value: refresh_token,
        domain: hostname,
        path: '/',
        httpOnly: true,
        secure: false,
      })
    }
    await page.context().addCookies(cookiesToAdd as any)
  }

  // Reload to ensure cookies are attached to page requests. Guarded to avoid throwing
  // if the test closed the page unexpectedly.
  try {
    await page.goto('/')
  } catch (e) {
    console.warn('signInViaApi: page.goto reload failed', e)
  }

  // Verify server-side session visibility via the public auth session endpoint.
  try {
    const sessionCheck = await page.request.get(`${base}/api/auth/session`)
    if (!sessionCheck.ok()) {
      const txt = await sessionCheck.text().catch(() => '')
      throw new Error(`auth session check failed: ${sessionCheck.status()} ${txt}`)
    }
    const sessionJson = await sessionCheck.json().catch(() => ({}))
    if (!sessionJson?.authenticated) {
      throw new Error('server did not recognize authenticated session')
    }
  } catch (err) {
    console.error('signInViaApi: server auth session check failed', err)
    throw err
  }

  return { email, password }
}

export default signInViaApi
