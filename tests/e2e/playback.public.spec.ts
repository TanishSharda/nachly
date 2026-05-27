import { test, expect } from '@playwright/test'

test.describe('Public playback', () => {
  const url = process.env.E2E_PUBLIC_URL || 'https://nachly.in/test-public-playback?src=/bijuria.mp4'

  test('production test-public-playback autoplays muted video', async ({ page }) => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

    await page.waitForSelector('video', { timeout: 15000 })

    const played = await page.evaluate(async () => {
      const v = document.querySelector('video') as HTMLVideoElement | null
      if (!v) return false
      v.muted = true
      v.playsInline = true
      try {
        await v.play()
        await new Promise((r) => setTimeout(r, 1500))
        return v.currentTime > 0
      } catch (err) {
        return false
      }
    })

    expect(played).toBeTruthy()
  })
})
