import { test, expect } from '@playwright/test'

test.describe('Email signin flow', () => {
  const email = `e2e+${Date.now()}@example.com`
  const password = 'TestPass123!'

  test.beforeAll(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing SUPABASE env for e2e test')
    }

    // Create user via internal test API route that uses the service role client
    const res = await fetch('http://localhost:3001/api/test/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Failed to create test user: ${res.status} ${body}`)
    }
  })

  test('logs in and gets session cookie', async ({ page }) => {
    await page.goto('http://localhost:3001/')

    // Client-side navigate to login (server may return 404 for direct GET)
    await page.evaluate(() => {
      const a = document.createElement('a')
      a.href = '/auth?mode=login'
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
    })
    await page.waitForURL('**/auth?mode=login*')

    // Click Sign in with Email
    await page.click('text=Sign in with Email')

    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/select-role' || url.pathname.startsWith('/explore')),
      page.click('button:has-text("Sign In")'),
    ])

    // Check supabase auth cookie
    const cookies = await page.context().cookies()
    const sbToken = cookies.find((c) => c.name === 'sb-access-token' || c.name === 'sb:token')
    expect(sbToken).toBeTruthy()
  })
})
