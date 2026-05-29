import { test as base, expect, type Page, type APIRequestContext, type BrowserContext } from '@playwright/test'

const test = base.extend<{ page: Page }>({
  page: async ({ context, request }, use, testInfo) => {
    // Use Playwright-provided context instead of creating/closing our own

    // Only seed when ENABLE_E2E_SEED is set AND the test title indicates Creator flows
    const shouldSeed = process.env.ENABLE_E2E_SEED === '1' && /creator/i.test(testInfo.title)
    if (shouldSeed) {
      const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'

      const email = `e2e+${Date.now()}@example.com`
      const password = 'TestPass123!'

      // Use Playwright's request fixture to call the runtime test API
      const apiReq = request as APIRequestContext
      const createRes = await apiReq.post(`${baseURL}/api/test/create-user`, {
        headers: { 'Content-Type': 'application/json' },
        data: { email, password },
      })
      if (createRes.status() < 200 || createRes.status() >= 300) {
        const body = await createRes.text().catch(() => '')
        throw new Error(`create-user failed: ${createRes.status()} ${body}`)
      }

      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
      const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!SUPABASE_URL || !SUPABASE_ANON) {
        throw new Error('Missing Supabase env vars for signing in')
      }

      const tokenRes = await apiReq.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
        data: { email, password },
      })
      if (tokenRes.status() < 200 || tokenRes.status() >= 300) {
        const body = await tokenRes.text().catch(() => '')
        throw new Error(`supabase token failed: ${tokenRes.status()} ${body}`)
      }
      const tokenJson = await tokenRes.json()
      const access_token = tokenJson.access_token
      const refresh_token = tokenJson.refresh_token

      // Try to inject auth cookies directly into the browser context for the app origin.
      // This avoids navigating pages and is faster/more deterministic.
      const origin = baseURL
      const hostname = new URL(baseURL).hostname
      const cookies: any[] = [
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
        cookies.push({
          name: 'sb-refresh-token',
          value: refresh_token,
          domain: hostname,
          path: '/',
          httpOnly: true,
          secure: false,
        })
      }

      console.log('[fixture] adding cookies to context:', cookies.map(c => ({ name: c.name, domain: c.domain || c.url })))
      try {
        await context.addCookies(cookies)
      } catch (err) {
        console.warn('[fixture] context.addCookies failed, falling back to page POST', err)
        // Fallback: use a page in the app origin to call the server-side session setter
        const tempPage = await context.newPage()
        try {
          await tempPage.goto(baseURL, { waitUntil: 'domcontentloaded' })
          await tempPage.evaluate(async (body) => {
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          }, { access_token, refresh_token, expires_at: tokenJson.expires_at })
        } finally {
          try {
            await tempPage.close()
          } catch (e) {
            console.error('[fixture] tempPage.close failed', e)
          }
        }
      }
    }

    // Attach diagnostics to capture runtime errors/crashes for flaky tests
    context.on('page', (p: BrowserContext['pages'] extends infer R ? any : any) => {
      p.on('pageerror', (err) => console.error('[fixture] pageerror:', err && err.message ? err.message : err))
      p.on('crash', () => console.error('[fixture] page crash'))
      p.on('close', () => console.log('[fixture] page closed'))
      p.on('console', (msg) => console.log('[fixture][console]', msg.type(), msg.text()))
      p.on('requestfailed', (req) => console.warn('[fixture] requestfailed', req.url(), req.failure()?.errorText))
    })

    context.setDefaultNavigationTimeout(60000)
    context.setDefaultTimeout(60000)

    // Abort large media requests to reduce noise and memory usage in tests
    try {
      await context.route('**/*.{mp4,webm}', (route) => {
        console.log('[fixture] aborting media request', route.request().url())
        route.abort()
      })
    } catch (e) {
      console.warn('[fixture] route install failed', e)
    }

    // Use the provided context's page. Retry on transient newPage failures.
    let page: any
    for (let i = 0; i < 3; i++) {
      try {
        page = await context.newPage()
        break
      } catch (e) {
        console.warn('[fixture] context.newPage failed, retrying', i, e)
        await new Promise((r) => setTimeout(r, 300 * (i + 1)))
      }
    }
    if (!page) throw new Error('Failed to create a new page after retries')
    await use(page)
  },
})

export { test, expect }
