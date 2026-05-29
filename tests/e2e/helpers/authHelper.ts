import { Page } from '@playwright/test'
import signInViaApi from './sessionHelper'
import { navigateWithRetry } from './navigationHelper'

export async function ensureSignedIn(page: Page, opts?: { email?: string; password?: string }) {
  const email = opts?.email || `e2e+${Date.now()}@example.com`
  const password = opts?.password || 'TestPass123!'

  // Prefer injecting an authenticated session via API (faster, deterministic)
  try {
    await signInViaApi(page, { email, password })
    return { email, password }
  } catch (err) {
    console.warn('signInViaApi failed, falling back to UI sign-in:', err)
  }

  // Fallback to UI sign-in if session injection fails
  // Determine API base: prefer PLAYWRIGHT_BASE_URL, fall back to localhost.
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'

  const res = await page.request.post(`${base}/api/test/create-user`, {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email, password }),
  })
  const status = res.status()
  if (status < 200 || status >= 300) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to create test user (base=${base}): ${status} ${body}`)
  }

  await navigateWithRetry(page, '/auth?mode=login', { waitUntil: 'domcontentloaded' }, 2)
  await page.waitForURL('**/auth?mode=login*')

  await page.click('text=Sign in with Email')
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/select-role' || url.pathname.startsWith('/explore'), { timeout: 60000 }),
    page.click('button:has-text("Sign In")'),
  ])

  // If the app lands on the role selection page, choose Creator (choreographer)
  const landed = new URL(page.url())
  if (landed.pathname === '/select-role') {
    try {
      const creatorBtn = page.getByRole('button', { name: /continue as creator/i })
      if (await creatorBtn.count() > 0) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
          creatorBtn.click(),
        ])
      } else {
        const alt = page.getByText(/Choreographer|Creator/i).first()
        if (await alt.count() > 0) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
            alt.click(),
          ])
        }
      }
    } catch (e) {
      console.warn('auto-select role failed', e)
    }
  }

  return { email, password }
}
